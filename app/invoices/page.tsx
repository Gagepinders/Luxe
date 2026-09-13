import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, EmptyState, StatCard } from "@/components/ui";
import StatusDropdown from "@/components/StatusDropdown";
import { setInvoiceStatus } from "@/app/actions/invoices";
import { INVOICE_STATUS_OPTIONS } from "@/lib/statusOptions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Receipt, DollarSign, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const all = await prisma.invoice.findMany({ include: { lineItems: true } });
  const total = (inv: (typeof all)[number]) =>
    inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  const now = new Date();
  // Auto-flag overdue invoices for display without needing a cron job.
  const isEffectivelyOverdue = (inv: (typeof all)[number]) =>
    inv.status === "sent" && inv.dueAt !== null && inv.dueAt < now;

  const outstanding = all
    .filter((i) => i.status === "sent" || isEffectivelyOverdue(i))
    .reduce((s, i) => s + total(i), 0);
  const paidThisMonth = all
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paidAt &&
        i.paidAt.getMonth() === now.getMonth() &&
        i.paidAt.getFullYear() === now.getFullYear()
    )
    .reduce((s, i) => s + total(i), 0);
  const overdueCount = all.filter(isEffectivelyOverdue).length;

  const invoices = await prisma.invoice.findMany({
    where: status ? { status } : {},
    include: { customer: true, lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Invoices"
        subtitle="Bill completed jobs and track what's outstanding"
        icon={Receipt}
        action={
          <Button href="/invoices/new">
            <Plus size={16} /> New Invoice
          </Button>
        }
      />

      <div className="stagger-in grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Receipt} label="Outstanding" value={formatCurrency(outstanding)} tone="gold" />
        <StatCard icon={DollarSign} label="Paid this month" value={formatCurrency(paidThisMonth)} tone="forest" />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? "danger" : "forest"}
          href={overdueCount > 0 ? "/invoices?status=overdue" : undefined}
        />
      </div>

      <div className="flex gap-1 mb-5 border-b border-border-subtle">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/invoices?status=${t.key}` : "/invoices"}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              (status ?? "") === t.key
                ? "border-forest-700 text-forest-950"
                : "border-transparent text-forest-950/50 hover:text-forest-950"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices here"
          description="Create an invoice from a completed job or from scratch."
          action={
            <Button href="/invoices/new">
              <Plus size={16} /> New Invoice
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-forest-950/60 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 hidden sm:table-cell">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const effectiveStatus = isEffectivelyOverdue(inv) ? "overdue" : inv.status;
                return (
                  <tr key={inv.id} className="border-t border-border-subtle hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-forest-950">
                        #{inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-forest-950">
                        {inv.customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(total(inv))}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-forest-950/60">
                      {inv.dueAt ? formatDate(inv.dueAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown
                        value={inv.status}
                        colorKey={effectiveStatus}
                        options={INVOICE_STATUS_OPTIONS}
                        onChange={setInvoiceStatus.bind(null, inv.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
