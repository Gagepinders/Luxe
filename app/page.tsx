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
  ChevronRight,
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
  const fourteenDaysAgo = startOfDay(addDays(now, -13));

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
    recentWonQuotes,
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
    prisma.quote.findMany({
      where: { status: "won", decidedAt: { gte: fourteenDaysAgo } },
      include: { lineItems: true },
    }),
  ]);

  const followUpsDue = pendingFollowUps.filter((f) => f.followUpAt <= now).length;

  const total = (q: { lineItems: { quantity: number; unitPrice: number }[] }) =>
    q.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  const sparklineDays = Array.from({ length: 14 }, (_, i) => startOfDay(addDays(fourteenDaysAgo, i)));
  const sparklineValues = sparklineDays.map((day) =>
    recentWonQuotes
      .filter((q) => q.decidedAt && startOfDay(q.decidedAt).getTime() === day.getTime())
      .reduce((s, q) => s + total(q), 0)
  );

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

      <div className="grid lg:grid-cols-[minmax(240px,340px)_1fr] gap-4 items-stretch">
        <HeroStat
          label="Won revenue this month"
          value={formatCurrency(wonRevenueThisMonth)}
          winRate={winRate}
          sparkline={sparklineValues}
        />
        <div className="stagger-in grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatTile icon={TrendingUp} label="Profit (mo.)" value={formatCurrency(profitThisMonth)} tone="forest" />
          <StatTile icon={CheckCircle2} label="Jobs completed (mo.)" value={String(jobsCompletedThisMonth)} tone="forest" />
          <StatTile icon={Repeat} label="Recurring rev. (mo. est.)" value={formatCurrency(recurringMonthlyValue)} tone="ice" />
          <StatTile icon={Receipt} label="Outstanding invoices" value={formatCurrency(outstandingInvoices)} tone="ice" />
          <StatTile icon={Users} label="Customers" value={String(customerCount)} tone="gold" />
          <StatTile icon={Target} label="Win rate" value={`${winRate.toFixed(0)}%`} tone="gold" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <AlertItem
          icon={AlertTriangle}
          label="Needs follow-up"
          detail="Quotes gone quiet + overdue invoices"
          value={overdueQuotes.length + overdueInvoices.length}
          href="/quotes?status=sent"
        />
        <AlertItem
          icon={PhoneCall}
          label="Follow-ups due"
          detail="Calls you promised to make"
          value={followUpsDue}
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

const TILE_TONES: Record<string, string> = {
  forest: "bg-gradient-to-br from-forest-100 to-forest-100/60 text-forest-700",
  ice: "bg-gradient-to-br from-ice-100 to-ice-100/60 text-ice-600",
  gold: "bg-gradient-to-br from-gold-100 to-gold-100/60 text-gold-600",
  warning: "bg-gradient-to-br from-warning-100 to-warning-100 text-warning",
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "forest",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "forest" | "ice" | "gold" | "warning";
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${TILE_TONES[tone]}`}>
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

// The dashboard's one featured number — bigger, on a gradient ground, with a
// real 14-day sparkline so "revenue" reads as a trend, not just a total.
function HeroStat({
  label,
  value,
  winRate,
  sparkline,
}: {
  label: string;
  value: string;
  winRate: number;
  sparkline: number[];
}) {
  const max = Math.max(1, ...sparkline);
  const W = 280;
  const H = 56;
  const step = W / (sparkline.length - 1);
  const points = sparkline.map((v, i) => `${i * step},${H - (v / max) * (H - 6) - 3}`).join(" ");
  const areaPoints = `0,${H} ${points} ${W},${H}`;

  return (
    <div className="animate-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-800 to-forest-950 p-5 flex flex-col justify-between text-white shadow-[0_12px_32px_-12px_rgba(13,31,20,0.5)]">
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-gold-500/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <DollarSign size={16} />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-forest-100/70">{label}</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-gold-500">
          <Target size={11} /> {winRate.toFixed(0)}% win rate
        </span>
      </div>

      <p className="relative mt-3 text-4xl font-semibold tracking-tight">{value}</p>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a227" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#sparkFill)" />
          <polyline points={points} fill="none" stroke="#c9a227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-[10px] text-forest-100/50 mt-1">Last 14 days</p>
      </div>
    </div>
  );
}

// A horizontal "thing to do" row rather than a stat to admire — visually
// distinct from the number tiles so it reads as actionable, not decorative.
function AlertItem({
  icon: Icon,
  label,
  detail,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  value: number;
  href: string;
}) {
  const active = value > 0;
  return (
    <Link
      href={href}
      className={`card card-interactive flex items-center gap-3.5 p-4 ${
        active ? "border-warning/30 bg-gradient-to-r from-warning-100/60 to-transparent" : ""
      }`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-warning text-white" : "bg-forest-100 text-forest-700"
        }`}
      >
        <Icon size={17} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-forest-950">{label}</p>
        <p className="text-xs text-forest-950/50 truncate">{detail}</p>
      </div>
      <p className={`text-2xl font-semibold tracking-tight ${active ? "text-warning" : "text-forest-950/30"}`}>
        {value}
      </p>
      <ChevronRight size={16} className="text-forest-950/30 flex-shrink-0" />
    </Link>
  );
}
