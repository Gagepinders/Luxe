"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";
import { generateToken } from "@/lib/tokens";
import { getAppUrl } from "@/lib/appUrl";
import { formatCurrency } from "@/lib/format";
import { isSquareConfigured, ensureSquareCustomerId, createSquareInvoice } from "@/lib/square";

type LineItemPayload = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  serviceTypeId?: string | null;
};

function parseLineItems(raw: FormDataEntryValue | null): LineItemPayload[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((li) => li.description)
      .map((li) => ({
        description: String(li.description),
        quantity: Number(li.quantity) || 1,
        unit: String(li.unit || "visit"),
        unitPrice: Number(li.unitPrice) || 0,
        serviceTypeId: li.serviceTypeId || null,
      }));
  } catch {
    return [];
  }
}

export async function createInvoice(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "");
  const jobId = String(formData.get("jobId") ?? "") || null;
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lineItems = parseLineItems(formData.get("lineItemsPayload"));

  if (!customerId) throw new Error("Customer is required");

  const invoiceCount = await prisma.invoice.count();

  const invoice = await prisma.invoice.create({
    data: {
      number: invoiceCount + 2001,
      customerId,
      jobId,
      dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
      notes,
      lineItems: {
        create: lineItems.map((li, i) => ({
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          unitPrice: li.unitPrice,
          sortOrder: i,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      customerId,
      type: "note",
      body: `Invoice #${invoice.number} created (draft).`,
    },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(id: string, formData: FormData) {
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lineItems = parseLineItems(formData.get("lineItemsPayload"));

  await prisma.$transaction([
    prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
        notes,
        lineItems: {
          create: lineItems.map((li, i) => ({
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: li.unitPrice,
            sortOrder: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function setInvoiceStatus(id: string, status: "draft" | "sent" | "paid" | "overdue") {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  await prisma.invoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === "paid" ? new Date() : status === "sent" ? null : invoice.paidAt,
    },
  });
  await prisma.activity.create({
    data: {
      customerId: invoice.customerId,
      type: "status_change",
      body: `Invoice #${invoice.number} marked ${status}.`,
    },
  });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

// Creates (if not already created) the Square Order + Invoice behind one of
// our invoices, so it has a real "pay online" link. Safe to call more than
// once — a second call is a no-op once squareInvoiceId is set.
export async function ensureSquareInvoiceForInvoice(id: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (invoice.squareInvoiceId) return invoice;
  if (!isSquareConfigured()) return invoice;

  const squareCustomerId = await ensureSquareCustomerId(invoice.customer);
  if (!invoice.customer.squareCustomerId) {
    await prisma.customer.update({
      where: { id: invoice.customerId },
      data: { squareCustomerId },
    });
  }

  const { squareInvoiceId, squareOrderId, publicUrl } = await createSquareInvoice(
    invoice,
    squareCustomerId
  );

  return prisma.invoice.update({
    where: { id },
    data: { squareInvoiceId, squareOrderId, squarePublicUrl: publicUrl },
    include: { customer: true, lineItems: true },
  });
}

// Button-triggered version for the invoice detail page: sets up the Square
// payment link without also sending an email (e.g. to text or read the link
// to the customer over the phone).
export async function setUpSquarePayment(id: string) {
  if (!isSquareConfigured()) {
    throw new Error("Square isn't connected yet — add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID first.");
  }
  await ensureSquareInvoiceForInvoice(id);
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

// Emails the customer a link to view the invoice online — no login required.
// If Square is configured, also sets up a Square payment link first so the
// email and the public invoice page can offer "Pay now".
export async function sendInvoiceToCustomer(id: string) {
  let invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (!invoice.customer.email) {
    throw new Error("This customer has no email on file — add one before sending.");
  }
  const customerEmail = invoice.customer.email;

  if (!invoice.squareInvoiceId && isSquareConfigured()) {
    invoice = await ensureSquareInvoiceForInvoice(id);
  }

  const token = invoice.publicToken ?? generateToken();
  const total = invoice.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const company = await getCompanyProfile();
  const link = `${getAppUrl()}/i/${token}`;

  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email isn't configured on this deployment (RESEND_API_KEY missing).");
  }

  await resend.emails.send({
    from: getFromAddress(),
    to: customerEmail,
    replyTo: getReplyToAddress(),
    subject: `Invoice #${invoice.number} from ${company.name}`,
    html: `
      <p>Hi ${invoice.customer.name.split(" ")[0]},</p>
      <p>Here's invoice #${invoice.number} from ${company.name} for <strong>${formatCurrency(total)}</strong>${
        invoice.dueAt ? `, due ${new Date(invoice.dueAt).toLocaleDateString()}` : ""
      }.</p>
      <p><a href="${link}" style="display:inline-block;background:#235233;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">View invoice</a></p>
      ${
        invoice.squarePublicUrl
          ? `<p><a href="${invoice.squarePublicUrl}" style="display:inline-block;background:#006aff;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Pay now with Square</a></p>`
          : ""
      }
      <p style="color:#666;font-size:13px;">Or copy this link: ${link}</p>
      <p>Thanks,<br>${company.name}<br>${company.phone}</p>
    `,
  });

  await prisma.invoice.update({
    where: { id },
    data: { publicToken: token, status: invoice.status === "draft" ? "sent" : invoice.status },
  });

  await prisma.activity.create({
    data: {
      customerId: invoice.customerId,
      type: "email",
      body: `Invoice #${invoice.number} emailed to customer.${
        invoice.squarePublicUrl ? " Included a Square payment link." : ""
      }`,
    },
  });

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}
