"use server";

import { prisma } from "@/lib/prisma";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";

function audienceWhere(audience: string): Prisma.CustomerWhereInput {
  const base: Prisma.CustomerWhereInput = { email: { not: null } };
  if (audience === "all") return base;
  if (audience.startsWith("status:")) {
    return { ...base, status: audience.slice("status:".length) };
  }
  if (audience.startsWith("pipeline:")) {
    return { ...base, pipelineStage: audience.slice("pipeline:".length) };
  }
  if (audience.startsWith("tag:")) {
    return { ...base, tags: { contains: audience.slice("tag:".length) } };
  }
  return base;
}

export async function countAudience(audience: string) {
  return prisma.customer.count({ where: audienceWhere(audience) });
}

export async function createCampaign(formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all");

  if (!subject || !body) throw new Error("Subject and body are required");

  const campaign = await prisma.emailCampaign.create({
    data: { subject, body, audience },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaign(id: string, formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all");

  await prisma.emailCampaign.update({
    where: { id },
    data: { subject, body, audience },
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function deleteCampaign(id: string) {
  await prisma.emailCampaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function sendCampaign(id: string) {
  const campaign = await prisma.emailCampaign.findUniqueOrThrow({ where: { id } });
  const resend = getResendClient();

  if (!resend) {
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage: "RESEND_API_KEY is not configured on this deployment.",
      },
    });
    revalidatePath(`/campaigns/${id}`);
    redirect(`/campaigns/${id}`);
  }

  const recipients = await prisma.customer.findMany({
    where: audienceWhere(campaign.audience),
    select: { id: true, name: true, email: true },
  });

  await prisma.emailCampaign.update({
    where: { id },
    data: { status: "sending" },
  });

  let sent = 0;
  let lastError: string | null = null;

  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const personalizedBody = campaign.body
      .replaceAll("{{name}}", recipient.name.split(" ")[0])
      .replaceAll("\n", "<br>");
    try {
      await resend!.emails.send({
        from: getFromAddress(),
        to: recipient.email,
        replyTo: getReplyToAddress(),
        subject: campaign.subject,
        html: personalizedBody,
      });
      sent += 1;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown send error";
    }
  }

  await prisma.emailCampaign.update({
    where: { id },
    data: {
      status: sent > 0 ? "sent" : "failed",
      recipientCount: sent,
      sentAt: new Date(),
      errorMessage: sent === recipients.length ? null : lastError,
    },
  });

  await prisma.activity.createMany({
    data: recipients
      .filter((r) => r.email)
      .map((r) => ({
        customerId: r.id,
        type: "email",
        body: `Received campaign email: "${campaign.subject}"`,
      })),
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}
