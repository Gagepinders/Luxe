"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";
import { generateToken } from "@/lib/tokens";
import { getAppUrl } from "@/lib/appUrl";
import { formatCurrency } from "@/lib/format";

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

// Emails the customer a link to view the invoice online — no login required.
export async function sendInvoiceToCustomer(id: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (!invoice.customer.email) {
    throw new Error("This customer has no email on file — add one before sending.");
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
    to: invoice.customer.email,
    replyTo: getReplyToAddress(),
    subject: `Invoice #${invoice.number} from ${company.name}`,
    html: `
      <p>Hi ${invoice.customer.name.split(" ")[0]},</p>
      <p>Here's invoice #${invoice.number} from ${company.name} for <strong>${formatCurrency(total)}</strong>${
        invoice.dueAt ? `, due ${new Date(invoice.dueAt).toLocaleDateString()}` : ""
      }.</p>
      <p><a href="${link}" style="display:inline-block;background:#235233;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">View invoice</a></p>
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
      body: `Invoice #${invoice.number} emailed to customer.`,
    },
  });

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}
