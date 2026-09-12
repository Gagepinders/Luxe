"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatDate } from "@/lib/format";
import { CALL_OUTCOME_LABELS } from "@/lib/callLogs";

export async function logCall(customerId: string, formData: FormData) {
  const direction = String(formData.get("direction") ?? "outbound");
  const outcome = String(formData.get("outcome") ?? "connected");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const followUpAtRaw = String(formData.get("followUpAt") ?? "");
  const followUpAt = followUpAtRaw ? new Date(followUpAtRaw) : null;

  await prisma.callLog.create({
    data: { customerId, direction, outcome, notes, followUpAt },
  });

  const outcomeLabel = CALL_OUTCOME_LABELS[outcome] ?? outcome;
  await prisma.activity.create({
    data: {
      customerId,
      type: "call",
      body: `${direction === "inbound" ? "Inbound" : "Outbound"} call — ${outcomeLabel}.${
        notes ? ` ${notes}` : ""
      }${followUpAt ? ` Follow up ${formatDate(followUpAt)}.` : ""}`,
    },
  });

  // A connected call on a brand-new lead means they've actually been
  // talked to — nudge the pipeline stage forward so it isn't stuck at "new".
  if (outcome === "connected") {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (customer.pipelineStage === "new") {
      await prisma.customer.update({
        where: { id: customerId },
        data: { pipelineStage: "contacted" },
      });
    }
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/calls");
  revalidatePath("/pipeline");
  revalidatePath("/");
}

export async function clearFollowUp(callId: string, customerId: string) {
  await prisma.callLog.update({ where: { id: callId }, data: { followUpAt: null } });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/calls");
  revalidatePath("/");
}

export async function deleteCallLog(callId: string, customerId: string) {
  await prisma.callLog.delete({ where: { id: callId } });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/calls");
  revalidatePath("/");
}
