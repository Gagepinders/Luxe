import { prisma } from "@/lib/prisma";

export const CALL_OUTCOME_LABELS: Record<string, string> = {
  connected: "Connected",
  voicemail: "Left voicemail",
  no_answer: "No answer",
  busy: "Busy",
  wrong_number: "Wrong number",
};

export type PendingFollowUp = {
  callId: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  followUpAt: Date;
  lastOutcome: string;
  lastNotes: string | null;
};

// A customer's "pending follow-up" is the followUpAt on their single most
// recent call — once a newer call is logged (with or without a new
// followUpAt), it naturally supersedes the old one. No separate "done" flag
// to manage.
export async function getPendingFollowUps(): Promise<PendingFollowUp[]> {
  const calls = await prisma.callLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  const seen = new Set<string>();
  const pending: PendingFollowUp[] = [];
  for (const call of calls) {
    if (seen.has(call.customerId)) continue;
    seen.add(call.customerId);
    if (call.followUpAt) {
      pending.push({
        callId: call.id,
        customerId: call.customerId,
        customerName: call.customer.name,
        customerPhone: call.customer.phone,
        followUpAt: call.followUpAt,
        lastOutcome: call.outcome,
        lastNotes: call.notes,
      });
    }
  }
  pending.sort((a, b) => a.followUpAt.getTime() - b.followUpAt.getTime());
  return pending;
}
