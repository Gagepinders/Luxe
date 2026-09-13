import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { formatCurrency, formatDateShort } from "@/lib/format";
import WeatherWidget from "@/components/WeatherWidget";
import { getPendingFollowUps } from "@/lib/callLogs";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, addDays } from "date-fns";
import {
  Plus,
  ArrowRight,
  DollarSign,
  Target,
  TrendingUp,
  CheckCircle2,
  Receipt,
  AlertTriangle,
  Repeat,
  Users,
  PhoneCall,
  LayoutDashboard,
  CalendarDays,
  Kanban,
  FileText,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "#9aa39d",
  sent: "#3e8fb0",
  won: "#1c6b3f",
  lost: "#b3261e",
};

export default async function Dashboard() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekAhead = addDays(now, 7);

  const [
    quotesAll,
    jobsThisMonth,
    upcomingJobs,
    recentQuotes,
    recurringJobs,
    customerCount,
    invoicesAll,
    company,
    pendingFollowUps,
  ] = await Promise.all([
    prisma.quote.findMany({ include: { lineItems: true } }),
    prisma.job.findMany({
      where: { scheduledDate: { gte: monthStart, lte: monthEnd } },
      include: { expenses: true },
    }),
    prisma.job.findMany({
      where: {
        scheduledDate: { gte: startOfDay(now), lte: endOfDay(weekAhead) },
        status: { not: "cancelled" },
      },
      include: { customer: true, property: true },
      orderBy: { scheduledDate: "asc" },
      take: 6,
    }),
    prisma.quote.findMany({
      include: { customer: true, lineItems: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.job.findMany({ where: { recurrence: { not: "none" } } }),
    prisma.customer.count(),
    prisma.invoice.findMany({ include: { lineItems: true } }),
    getCompanyProfile(),
    getPendingFollowUps(),
  ]);

  const followUpsDue = pendingFollowUps.filter((f) => f.followUpAt <= now).length;

  const total = (q: { lineItems: { quantity: number; unitPrice: number }[] }) =>
    q.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  const wonThisMonth = quotesAll.filter(
    (q) => q.status === "won" && q.decidedAt && q.decidedAt >= monthStart && q.decidedAt <= monthEnd
  );
  const wonRevenueThisMonth = wonThisMonth.reduce((s, q) => s + total(q), 0);

  const decided = quotesAll.filter((q) => q.status === "won" || q.status === "lost");
  const won = quotesAll.filter((q) => q.status === "won");
  const winRate = decided.length > 0 ? (won.length / decided.length) * 100 : 0;

  const STALE_QUOTE_DAYS = 5;
  const staleQuoteCutoff = new Date(now.getTime() - STALE_QUOTE_DAYS * 24 * 60 * 60 * 1000);
  const overdueQuotes = quotesAll.filter(
    (q) =>
      q.status === "sent" &&
      ((q.validUntil && q.validUntil < now) ||
        (q.sentAt && q.sentAt < staleQuoteCutoff))
  );
  const overdueInvoices = invoicesAll.filter(
    (i) => i.status === "sent" && i.dueAt && i.dueAt < now
  );

  const outstandingInvoices = invoicesAll
    .filter((i) => i.status === "sent" || overdueInvoices.includes(i))
    .reduce((s, i) => s + total(i), 0);

  const jobsCompletedThisMonth = jobsThisMonth.filter((j) => j.status === "completed").length;
  const profitThisMonth = jobsThisMonth
    .filter((j) => j.status === "completed")
    .reduce((s, j) => s + (j.price - j.expenses.reduce((e, x) => e + x.amount, 0)), 0);

  const recurringMonthlyValue = recurringJobs.reduce((s, j) => {
    const multiplier = j.recurrence === "weekly" ? 4.33 : j.recurrence === "biweekly" ? 2.17 : j.recurrence === "monthly" ? 1 : 0;
    return s + j.price * multiplier;
  }, 0);

  const pipelineCounts = ["draft", "sent", "won", "lost"].map((status) => ({
    status,
    count: quotesAll.filter((q) => q.status === status).length,
  }));
  const maxPipeline = Math.max(1, ...pipelineCounts.map((p) => p.count));

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${company.name} — ${company.city}, ${company.state}`}
        icon={LayoutDashboard}
        action={
          <div className="flex gap-2">
            <Button href="/quotes/new" variant="secondary">
              <Plus size={16} /> New Quote
            </Button>
            <Button href="/jobs/new">
              <Plus size={16} /> Schedule Job
            </Button>
          </div>
        }
      />

      <div className="stagger-in grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile icon={DollarSign} label="Won revenue (mo.)" value={formatCurrency(wonRevenueThisMonth)} />
        <StatTile icon={Target} label="Win rate" value={`${winRate.toFixed(0)}%`} />
        <StatTile icon={TrendingUp} label="Profit (mo.)" value={formatCurrency(profitThisMonth)} />
        <StatTile icon={CheckCircle2} label="Jobs completed (mo.)" value={String(jobsCompletedThisMonth)} />
        <StatTile icon={Receipt} label="Outstanding invoices" value={formatCurrency(outstandingInvoices)} />
        <StatTile
          icon={AlertTriangle}
          label="Needs follow-up (quotes + inv.)"
          value={String(overdueQuotes.length + overdueInvoices.length)}
          tone={overdueQuotes.length + overdueInvoices.length > 0 ? "warning" : undefined}
          href="/quotes?status=sent"
        />
        <StatTile icon={Repeat} label="Recurring rev. (mo. est.)" value={formatCurrency(recurringMonthlyValue)} />
        <StatTile icon={Users} label="Customers" value={String(customerCount)} />
        <StatTile
          icon={PhoneCall}
          label="Follow-ups due"
          value={String(followUpsDue)}
          tone={followUpsDue > 0 ? "warning" : undefined}
          href="/calls"
        />
      </div>

      <WeatherWidget />

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-forest-950">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                <CalendarDays size={14} />
              </span>
              Upcoming jobs (next 7 days)
            </h2>
            <Link href="/jobs" className="text-xs text-forest-700 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {upcomingJobs.length === 0 ? (
            <p className="text-sm text-forest-950/50">Nothing scheduled in the next week.</p>
          ) : (
            <ul className="stagger-in space-y-2">
              {upcomingJobs.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/jobs/${j.id}`}
                    className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2.5 hover:border-forest-500/30 hover:bg-surface-muted/60 hover:translate-x-0.5"
                  >
                    <span>
                      <span className="block text-sm font-medium text-forest-950">{j.title}</span>
                      <span className="block text-xs text-forest-950/50">
                        {j.customer.name} · {j.property.addressLine}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-forest-950/60">
                      {formatDateShort(j.scheduledDate)}
                      <StatusBadge status={j.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-forest-950 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
              <Kanban size={14} />
            </span>
            Quote pipeline
          </h2>
          <div className="space-y-3">
            {pipelineCounts.map((p) => (
              <div key={p.status}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-forest-950/70">{p.status}</span>
                  <span className="font-medium text-forest-950">{p.count}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${(p.count / maxPipeline) * 100}%`,
                      background: STATUS_COLORS[p.status],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/pipeline"
            className="mt-4 inline-flex items-center gap-1 text-xs text-forest-700 hover:underline"
          >
            View sales pipeline <ArrowRight size={12} />
          </Link>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 font-semibold text-forest-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ice-100 text-ice-600">
              <FileText size={14} />
            </span>
            Recent quote activity
          </h2>
          <Link href="/quotes" className="text-xs text-forest-700 hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recentQuotes.length === 0 ? (
          <p className="text-sm text-forest-950/50">No quotes yet.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {recentQuotes.map((q) => (
              <li key={q.id} className="py-2 flex items-center justify-between text-sm">
                <Link href={`/quotes/${q.id}`} className="text-forest-950 font-medium">
                  #{q.number} — {q.customer.name}
                </Link>
                <span className="flex items-center gap-3 text-xs text-forest-950/60">
                  {formatCurrency(total(q))}
                  <StatusBadge status={q.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "warning";
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
            tone === "warning"
              ? "bg-gradient-to-br from-warning-100 to-warning-100 text-warning"
              : "bg-gradient-to-br from-forest-100 to-forest-100/60 text-forest-700"
          }`}
        >
          <Icon size={15} />
        </span>
        <p className="text-[11px] font-medium text-forest-950/50 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-semibold tracking-tight ${tone === "warning" ? "text-warning" : "text-forest-950"}`}>
        {value}
      </p>
    </>
  );
  return href ? (
    <Link href={href} className="card card-interactive p-4 block">
      {content}
    </Link>
  ) : (
    <div className="card p-4">{content}</div>
  );
}
