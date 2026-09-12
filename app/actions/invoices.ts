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
