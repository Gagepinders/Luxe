import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, EmptyState } from "@/components/ui";
import StatusDropdown from "@/components/StatusDropdown";
import { setQuoteStatus } from "@/app/actions/quotes";
import { QUOTE_STATUS_OPTIONS } from "@/lib/statusOptions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const quotes = await prisma.quote.findMany({
    where: status ? { status } : {},
    include: { customer: true, lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  const all = await prisma.quote.findMany({ include: { lineItems: true } });
  const total = (q: (typeof all)[number]) =>
    q.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const decided = all.filter((q) => q.status === "won" || q.status === "lost");
  const won = all.filter((q) => q.status === "won");
  const winRate = decided.length > 0 ? (won.length / decided.length) * 100 : 0;
  const wonValue = won.reduce((s, q) => s + total(q), 0);
  const openValue = all
    .filter((q) => q.status === "sent" || q.status === "draft")
    .reduce((s, q) => s + total(q), 0);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Quotes"
        subtitle="Track every estimate from draft to won or lost"
        icon={FileText}
        action={
          <Button href="/quotes/new">
            <Plus size={16} /> New Quote
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-forest-950/50 uppercase tracking-wide">Win rate</p>
          <p className="text-xl font-semibold text-forest-950">{winRate.toFixed(0)}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-950/50 uppercase tracking-wide">Won value</p>
          <p className="text-xl font-semibold text-forest-950">{formatCurrency(wonValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-950/50 uppercase tracking-wide">Open pipeline</p>
          <p className="text-xl font-semibold text-forest-950">{formatCurrency(openValue)}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border-subtle">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/quotes?status=${t.key}` : "/quotes"}
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

      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes here"
          description="Create a quote to start tracking your pipeline."
          action={
            <Button href="/quotes/new">
              <Plus size={16} /> New Quote
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
                <th className="px-4 py-3 hidden sm:table-cell">Title</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 hidden md:table-cell">Created</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t border-border-subtle hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-forest-950">
                      #{q.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="text-forest-950">
                      {q.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-forest-950/70">
                    {q.title || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(total(q))}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-forest-950/60">
                    {formatDate(q.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown
                      value={q.status}
                      options={QUOTE_STATUS_OPTIONS}
                      onChange={setQuoteStatus.bind(null, q.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
