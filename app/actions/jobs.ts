"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function jobDataFromForm(formData: FormData) {
  const scheduledDateRaw = String(formData.get("scheduledDate") ?? "");
  return {
    customerId: String(formData.get("customerId") ?? ""),
    propertyId: String(formData.get("propertyId") ?? ""),
    serviceTypeId: String(formData.get("serviceTypeId") ?? "") || null,
    title: String(formData.get("title") ?? "").trim(),
    scheduledDate: scheduledDateRaw ? new Date(scheduledDateRaw) : new Date(),
    startTime: String(formData.get("startTime") ?? "").trim() || null,
    endTime: String(formData.get("endTime") ?? "").trim() || null,
    crew: String(formData.get("crew") ?? "").trim() || null,
    price: Number(formData.get("price") ?? 0) || 0,
    recurrence: String(formData.get("recurrence") ?? "none"),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createJob(formData: FormData) {
  const data = jobDataFromForm(formData);
  if (!data.customerId) throw new Error("Customer is required");
  if (!data.propertyId) throw new Error("Property is required");
  if (!data.title) data.title = "Service visit";

  const job = await prisma.job.create({ data });

  await prisma.activity.create({
    data: {
      customerId: data.customerId,
      type: "job",
      body: `Job "${job.title}" scheduled for ${job.scheduledDate.toDateString()}.`,
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/routes");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(id: string, formData: FormData) {
  const data = jobDataFromForm(formData);
  if (!data.title) data.title = "Service visit";

  await prisma.job.update({ where: { id }, data });
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/routes");
  redirect(`/jobs/${id}`);
}

export async function deleteJob(id: string) {
  await prisma.job.delete({ where: { id } });
  revalidatePath("/jobs");
  revalidatePath("/routes");
  redirect("/jobs");
}

export async function setJobStatus(id: string, status: "scheduled" | "in_progress" | "completed" | "cancelled") {
  await prisma.job.update({
    where: { id },
    data: { status, completedAt: status === "completed" ? new Date() : null },
  });
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/routes");
  redirect(`/jobs/${id}`);
}

const RECURRENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export async function duplicateJobToNext(id: string) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id } });
  const days = RECURRENCE_DAYS[job.recurrence] ?? 7;
  const nextDate = new Date(job.scheduledDate);
  nextDate.setDate(nextDate.getDate() + days);

  const next = await prisma.job.create({
    data: {
      customerId: job.customerId,
      propertyId: job.propertyId,
      quoteId: job.quoteId,
      serviceTypeId: job.serviceTypeId,
      title: job.title,
      scheduledDate: nextDate,
      startTime: job.startTime,
      endTime: job.endTime,
      crew: job.crew,
      price: job.price,
      recurrence: job.recurrence,
      notes: job.notes,
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/routes");
  redirect(`/jobs/${next.id}`);
}

export async function setJobRouteOrder(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.job.update({ where: { id }, data: { routeOrder: index } })
    )
  );
  revalidatePath("/routes");
}
