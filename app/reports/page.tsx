import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, Target, PiggyBank, Trophy, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function ReportsPage() {
  const [invoices, quotes, jobs, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "paid" },
      include: { lineItems: true, customer: { select: { id: true, name: true } } },
    }),
    prisma.quote.findMany({ include: { lineItems: true } }),
    prisma.job.findMany({
      where: { status: "completed" },
      include: { expenses: true },
    }),
    prisma.customer.count(),
  ]);

  const invoiceTotal = (inv: (typeof invoices)[number]) =>
    inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const quoteTotal = (q: (typeof quotes)[number]) =>
    q.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  // Revenue collected by month, last 6 months
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  const revenueByMonth = new Map(months.map((m) => [m, 0]));
  for (const inv of invoices) {
    const key = monthKey(new Date(inv.paidAt ?? inv.issuedAt));
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + invoiceTotal(inv));
    }
  }
  const maxMonthRevenue = Math.max(1, ...Array.from(revenueByMonth.values()));

  const totalCollected = invoices.reduce((s, inv) => s + invoiceTotal(inv), 0);

  const decided = quotes.filter((q) => q.status === "won" || q.status === "lost");
  const won = decided.filter((q) => q.status === "won");
  const winRate = decided.length > 0 ? (won.length / decided.length) * 100 : null;
  const pipelineValue = quotes
    .filter((q) => q.status === "draft" || q.status === "sent")
    .reduce((s, q) => s + quoteTotal(q), 0);

  const jobMargins = jobs.map((j) => {
    const cost = j.expenses.reduce((s, e) => s + e.amount, 0);
    return { profit: j.price - cost, price: j.price };
  });
  const avgProfit =
    jobMargins.length > 0 ? jobMargins.reduce((s, j) => s + j.profit, 0) / jobMargins.length : null;
  const avgMarginPct =
    jobMargins.length > 0
      ? (jobMargins.reduce((s, j) => s + (j.price > 0 ? j.profit / j.price : 0), 0) /
          jobMargins.length) *
        100
      : null;

  const revenueByCustomer = new Map<string, { name: string; total: number }>();
  for (const inv of invoices) {
    const existing = revenueByCustomer.get(inv.customerId);
    const amt = invoiceTotal(inv);
    if (existing) existing.total += amt;
    else revenueByCustomer.set(inv.customerId, { name: inv.customer.name, total: amt });
  }
  const topCustomers = Array.from(revenueByCustomer.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title="Reports" subtitle="Where the business stands, at a glance." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp} label="Revenue collected (all time)" value={formatCurrency(totalCollected)} />
        <StatCard
          icon={Target}
          label="Quote win rate"
          value={winRate === null ? "—" : `${winRate.toFixed(0)}%`}
          hint={`${won.length} won / ${decided.length} decided`}
        />
        <StatCard
          icon={PiggyBank}
          label="Avg. job profit"
          value={avgProfit === null ? "—" : formatCurrency(avgProfit)}
          hint={avgMarginPct === null ? undefined : `${avgMarginPct.toFixed(0)}% margin`}
        />
        <StatCard icon={Trophy} label="Open pipeline value" value={formatCurrency(pipelineValue)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-forest-950 mb-4">Revenue collected, last 6 months</h2>
          <div className="flex items-end gap-3 h-40">
            {months.map((m) => {
              const value = revenueByMonth.get(m) ?? 0;
              const heightPct = Math.max(4, (value / maxMonthRevenue) * 100);
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-xs font-medium text-forest-950">
                    {value > 0 ? formatCurrency(value) : ""}
                  </p>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-forest-700"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-forest-950/50">{monthLabel(m)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-forest-950 mb-4">Top customers</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-forest-950/50">No paid invoices yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {topCustomers.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-forest-950/80">
                    <span className="text-forest-950/40 mr-1.5">{i + 1}.</span>
                    {c.name}
                  </span>
                  <span className="font-medium text-forest-950">{formatCurrency(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-forest-950/40">{customers} total customers</p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-forest-950/50 mb-1.5">
        <Icon size={14} />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-forest-950">{value}</p>
      {hint && <p className="text-xs text-forest-950/40 mt-0.5">{hint}</p>}
    </div>
  );
}
