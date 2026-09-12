"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";

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

const JOB_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];

export async function setJobStatus(id: string, status: string) {
  if (!JOB_STATUSES.includes(status)) throw new Error("Invalid job status");
  await prisma.job.update({
    where: { id },
    data: { status, completedAt: status === "completed" ? new Date() : null },
  });
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/routes");
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

// Generates several future occurrences at once instead of clicking "Schedule
// next occurrence" one at a time. Always chains off this job's own date, so
// running it twice for an overlapping range will create duplicates — meant
// for a fresh recurring job that doesn't have future visits scheduled yet.
export async function generateRecurringJobs(id: string, formData: FormData) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id } });
  const days = RECURRENCE_DAYS[job.recurrence] ?? 7;
  const count = Math.min(52, Math.max(1, Number(formData.get("count")) || 4));

  const data = [];
  const cursor = new Date(job.scheduledDate);
  for (let i = 0; i < count; i++) {
    cursor.setDate(cursor.getDate() + days);
    data.push({
      customerId: job.customerId,
      propertyId: job.propertyId,
      quoteId: job.quoteId,
      serviceTypeId: job.serviceTypeId,
      title: job.title,
      scheduledDate: new Date(cursor),
      startTime: job.startTime,
      endTime: job.endTime,
      crew: job.crew,
      price: job.price,
      recurrence: job.recurrence,
      notes: job.notes,
    });
  }
  await prisma.job.createMany({ data });

  revalidatePath("/jobs");
  revalidatePath("/routes");
  redirect("/jobs");
}

export async function setJobRouteOrder(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.job.update({ where: { id }, data: { routeOrder: index } })
    )
  );
  revalidatePath("/routes");
}

export async function requestReview(id: string) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id }, include: { customer: true } });
  const company = await getCompanyProfile();

  if (!job.customer.email) throw new Error("This customer has no email on file.");
  if (!company.googleReviewUrl) {
    throw new Error("Add a Google review link in Settings before sending review requests.");
  }

  const resend = getResendClient();
  if (!resend) throw new Error("Email isn't configured on this deployment (RESEND_API_KEY missing).");

  await resend.emails.send({
    from: getFromAddress(),
    to: job.customer.email,
    replyTo: getReplyToAddress(),
    subject: `How did we do, ${job.customer.name.split(" ")[0]}?`,
    html: `
      <p>Hi ${job.customer.name.split(" ")[0]},</p>
      <p>Thanks for choosing ${company.name} for "${job.title}"! If you have a minute, a quick review helps us out a lot.</p>
      <p><a href="${company.googleReviewUrl}" style="display:inline-block;background:#235233;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Leave a review</a></p>
      <p>Thanks again,<br>${company.name}</p>
    `,
  });

  await prisma.activity.create({
    data: {
      customerId: job.customerId,
      type: "email",
      body: `Review request sent for job "${job.title}".`,
    },
  });

  revalidatePath(`/jobs/${id}`);
  redirect(`/jobs/${id}`);
}
