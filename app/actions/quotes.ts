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

export async function createQuote(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const validUntilRaw = String(formData.get("validUntil") ?? "");
  const lineItems = parseLineItems(formData.get("lineItemsPayload"));

  if (!customerId) throw new Error("Customer is required");

  const quoteCount = await prisma.quote.count();

  const quote = await prisma.quote.create({
    data: {
      number: quoteCount + 1001,
      customerId,
      propertyId,
      title,
      notes,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
      lineItems: {
        create: lineItems.map((li, i) => ({
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          unitPrice: li.unitPrice,
          serviceTypeId: li.serviceTypeId,
          sortOrder: i,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      customerId,
      type: "quote",
      body: `Quote #${quote.number} created (draft).`,
    },
  });

  // Drafting a quote means at least a conversation happened.
  await prisma.customer.updateMany({
    where: { id: customerId, pipelineStage: "new" },
    data: { pipelineStage: "estimate_scheduled" },
  });

  revalidatePath("/pipeline");
  revalidatePath("/quotes");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuote(id: string, formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const validUntilRaw = String(formData.get("validUntil") ?? "");
  const lineItems = parseLineItems(formData.get("lineItemsPayload"));

  const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.quoteLineItem.deleteMany({ where: { quoteId: id } }),
    prisma.quote.update({
      where: { id },
      data: {
        propertyId,
        title,
        notes,
        validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
        lineItems: {
          create: lineItems.map((li, i) => ({
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: li.unitPrice,
            serviceTypeId: li.serviceTypeId,
            sortOrder: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  revalidatePath(`/customers/${existing.customerId}`);
  redirect(`/quotes/${id}`);
}

export async function deleteQuote(id: string, customerId: string) {
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/quotes");
  revalidatePath(`/customers/${customerId}`);
  redirect("/quotes");
}

export async function setQuoteStatus(
  id: string,
  status: "draft" | "sent" | "won" | "lost",
  formData?: FormData
) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id } });
  const lostReason = formData ? String(formData.get("lostReason") ?? "").trim() || null : null;

  await prisma.quote.update({
    where: { id },
    data: {
      status,
      sentAt: status === "sent" ? new Date() : quote.sentAt,
      decidedAt: status === "won" || status === "lost" ? new Date() : quote.decidedAt,
      lostReason: status === "lost" ? lostReason : status === "won" ? null : quote.lostReason,
    },
  });

  await prisma.activity.create({
    data: {
      customerId: quote.customerId,
      type: "status_change",
      body:
        status === "lost" && lostReason
          ? `Quote #${quote.number} marked lost: ${lostReason}`
          : `Quote #${quote.number} marked ${status}.`,
    },
  });

  // Keep the sales pipeline in sync with the quote's outcome.
  const pipelineByStatus: Record<string, string> = {
    sent: "estimate_sent",
    won: "won",
    lost: "lost",
  };
  const nextStage = pipelineByStatus[status];
  if (nextStage) {
    await prisma.customer.update({
      where: { id: quote.customerId },
      data: {
        pipelineStage: nextStage,
        status: status === "won" ? "active" : undefined,
      },
    });
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  revalidatePath(`/customers/${quote.customerId}`);
  revalidatePath("/pipeline");
  redirect(`/quotes/${id}`);
}

export async function convertQuoteToJob(id: string) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id },
    include: { lineItems: true },
  });

  if (!quote.propertyId) {
    throw new Error("Add a property to this quote before converting it to a job.");
  }

  const total = quote.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  const job = await prisma.job.create({
    data: {
      customerId: quote.customerId,
      propertyId: quote.propertyId,
      quoteId: quote.id,
      title: quote.title || `Quote #${quote.number}`,
      scheduledDate: new Date(),
      price: total,
      serviceTypeId: quote.lineItems[0]?.serviceTypeId ?? null,
    },
  });

  await prisma.activity.create({
    data: {
      customerId: quote.customerId,
      type: "job",
      body: `Quote #${quote.number} converted to job "${job.title}".`,
    },
  });

  revalidatePath("/jobs");
  revalidatePath(`/quotes/${id}`);
  redirect(`/jobs/${job.id}/edit`);
}

// Emails the customer a link to view and approve/decline the quote online —
// no login required on their end. Reuses the token if this quote was
// already sent before, so re-sending doesn't break a link already shared.
export async function sendQuoteToCustomer(id: string) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (!quote.customer.email) {
    throw new Error("This customer has no email on file — add one before sending.");
  }

  const token = quote.publicToken ?? generateToken();
  const total = quote.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const company = await getCompanyProfile();
  const link = `${getAppUrl()}/q/${token}`;

  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email isn't configured on this deployment (RESEND_API_KEY missing).");
  }

  await resend.emails.send({
    from: getFromAddress(),
    to: quote.customer.email,
    replyTo: getReplyToAddress(),
    subject: `Your quote from ${company.name}${quote.title ? ` — ${quote.title}` : ""}`,
    html: `
      <p>Hi ${quote.customer.name.split(" ")[0]},</p>
      <p>Here's your quote${quote.title ? ` for "${quote.title}"` : ""} from ${company.name}, totaling <strong>${formatCurrency(total)}</strong>.</p>
      <p><a href="${link}" style="display:inline-block;background:#235233;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">View & respond to quote</a></p>
      <p style="color:#666;font-size:13px;">Or copy this link: ${link}</p>
      <p>Thanks,<br>${company.name}<br>${company.phone}</p>
    `,
  });

  await prisma.quote.update({
    where: { id },
    data: { publicToken: token, status: "sent", sentAt: quote.sentAt ?? new Date() },
  });

  await prisma.customer.update({
    where: { id: quote.customerId },
    data: { pipelineStage: "estimate_sent" },
  });

  await prisma.activity.create({
    data: {
      customerId: quote.customerId,
      type: "email",
      body: `Quote #${quote.number} emailed to customer for online approval.`,
    },
  });

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath("/pipeline");
  redirect(`/quotes/${id}`);
}

// Called from the public /q/[token] page — no session, so this must never
// trust anything but the token itself to identify the quote.
export async function respondToQuotePublic(token: string, decision: "won" | "lost") {
  const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
  if (!quote) throw new Error("Quote not found.");

  if (quote.status !== "won" && quote.status !== "lost") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: decision, decidedAt: new Date() },
    });

    await prisma.customer.update({
      where: { id: quote.customerId },
      data: {
        pipelineStage: decision,
        status: decision === "won" ? "active" : undefined,
      },
    });

    await prisma.activity.create({
      data: {
        customerId: quote.customerId,
        type: "status_change",
        body: `Customer ${decision === "won" ? "approved" : "declined"} quote #${quote.number} online.`,
      },
    });

    revalidatePath(`/quotes/${quote.id}`);
    revalidatePath("/quotes");
    revalidatePath("/pipeline");
  }

  redirect(`/q/${token}`);
}
