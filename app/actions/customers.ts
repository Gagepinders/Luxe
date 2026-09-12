"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CustomerInput = {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  type: string;
  status: string;
  pipelineStage: string;
  source?: string;
  tags?: string;
  notes?: string;
};

function parseCustomerForm(formData: FormData): CustomerInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    companyName: String(formData.get("companyName") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    type: String(formData.get("type") ?? "residential"),
    status: String(formData.get("status") ?? "active"),
    pipelineStage: String(formData.get("pipelineStage") ?? "new"),
    source: String(formData.get("source") ?? "").trim() || undefined,
    tags: String(formData.get("tags") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

export async function createCustomer(formData: FormData) {
  const data = parseCustomerForm(formData);
  if (!data.name) throw new Error("Name is required");

  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const data = parseCustomerForm(formData);
  if (!data.name) throw new Error("Name is required");

  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function addCustomerNote(id: string, formData: FormData) {
  const body = String(formData.get("note") ?? "").trim();
  if (!body) return;
  await prisma.activity.create({
    data: { customerId: id, type: "note", body },
  });
  revalidatePath(`/customers/${id}`);
}

const PIPELINE_STAGES = [
  "new",
  "contacted",
  "estimate_scheduled",
  "estimate_sent",
  "won",
  "lost",
];

export async function setPipelineStage(id: string, stage: string) {
  if (!PIPELINE_STAGES.includes(stage)) throw new Error("Invalid pipeline stage");
  const customer = await prisma.customer.update({
    where: { id },
    data: { pipelineStage: stage },
  });
  await prisma.activity.create({
    data: {
      customerId: id,
      type: "status_change",
      body: `Moved to pipeline stage "${stage.replace("_", " ")}".`,
    },
  });
  revalidatePath("/pipeline");
  revalidatePath(`/customers/${id}`);
  return customer;
}
