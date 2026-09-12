import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getPendingFollowUps } from "@/lib/callLogs";
import { clearFollowUp } from "@/app/actions/calls";
import { PhoneCall } from "lucide-react";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function CallsPage() {
  const [pendingFollowUps, recentCalls] = await Promise.all([
    getPendingFollowUps(),
    prisma.callLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { customer: { select: { id: true, name: true } } },
    }),
  ]);

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = pendingFollowUps.filter((f) => f.followUpAt < today);
  const dueToday = pendingFollowUps.filter((f) => f.followUpAt >= today && f.followUpAt < tomorrow);
  const upcoming = pendingFollowUps.filter((f) => f.followUpAt >= tomorrow);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Calls"
        subtitle={`${pendingFollowUps.length} follow-up${pendingFollowUps.length === 1 ? "" : "s"} pending`}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <FollowUpGroup title="Overdue" items={overdue} tone="danger" />
          <FollowUpGroup title="Due today" items={dueToday} tone="warning" />
          <FollowUpGroup title="Upcoming" items={upcoming} />
          {pendingFollowUps.length === 0 && (
            <div className="card p-5 text-sm text-forest-950/50">
              No follow-ups pending. Log a call from a customer&apos;s page and set a follow-up date
              to start building your queue.
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-forest-950 mb-3 text-sm">Recent calls</h2>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-forest-950/50">No calls logged yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[70vh] overflow-y-auto">
              {recentCalls.map((c) => (
                <li key={c.id} className="text-xs border-b border-border-subtle pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/customers/${c.customer.id}`}
                      className="font-medium text-forest-950 hover:underline"
                    >
                      {c.customer.name}
                    </Link>
                    <StatusBadge status={c.outcome} />
                  </div>
                  <p className="text-forest-950/40 mt-0.5">
                    {c.direction === "inbound" ? "Inbound" : "Outbound"} · {formatDate(c.createdAt)}
                  </p>
                  {c.notes && <p className="text-forest-950/70 mt-0.5">{c.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function FollowUpGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getPendingFollowUps>>;
  tone?: "danger" | "warning";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-forest-950/70";

  return (
    <div className="card p-5">
      <h2 className={`font-semibold mb-3 text-sm ${toneClass}`}>
        {title} ({items.length})
      </h2>
      <ul className="space-y-2">
        {items.map((f) => {
          const clearAction = clearFollowUp.bind(null, f.callId, f.customerId);
          const telHref = f.customerPhone ? `tel:${f.customerPhone.replace(/[^\d+]/g, "")}` : null;
          return (
            <li
              key={f.callId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/customers/${f.customerId}`}
                  className="font-medium text-sm text-forest-950 hover:underline"
                >
                  {f.customerName}
                </Link>
                <p className="text-xs text-forest-950/50">
                  Follow up {formatDate(f.followUpAt)}
                  {f.lastNotes ? ` — ${f.lastNotes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {telHref && (
                  <a
                    href={telHref}
                    className="flex items-center gap-1 rounded-lg bg-forest-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-forest-800"
                  >
                    <PhoneCall size={12} /> Call
                  </a>
                )}
                <form action={clearAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs text-forest-950/60 hover:bg-surface-muted"
                  >
                    Clear
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
