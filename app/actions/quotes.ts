"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
