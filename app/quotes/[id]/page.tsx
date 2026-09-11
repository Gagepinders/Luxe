import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  setQuoteStatus,
  deleteQuote,
  convertQuoteToJob,
} from "@/app/actions/quotes";
import { Pencil, Trash2, Send, CheckCircle2, XCircle, ArrowRightCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      jobs: true,
    },
  });
  if (!quote) notFound();

  const total = quote.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  const markSent = setQuoteStatus.bind(null, id, "sent");
  const markWon = setQuoteStatus.bind(null, id, "won");
  const markLost = setQuoteStatus.bind(null, id, "lost");
  const convert = convertQuoteToJob.bind(null, id);
  const remove = deleteQuote.bind(null, id, quote.customerId);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={`Quote #${quote.number}`}
        subtitle={quote.title || undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href={`/quotes/${id}/edit`} variant="secondary">
              <Pencil size={14} /> Edit
            </Button>
            <form action={remove}>
              <Button type="submit" variant="danger">
                <Trash2 size={14} /> Delete
              </Button>
            </form>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-forest-950/50">
                <tr>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 w-16">Qty</th>
                  <th className="pb-2 w-16">Unit</th>
                  <th className="pb-2 w-24 text-right">Price</th>
                  <th className="pb-2 w-24 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-border-subtle">
                    <td className="py-2">{li.description}</td>
                    <td className="py-2">{li.quantity}</td>
                    <td className="py-2">{li.unit}</td>
                    <td className="py-2 text-right">{formatCurrency(li.unitPrice)}</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(li.quantity * li.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-3 border-t border-border-subtle mt-2">
              <p className="text-base font-semibold text-forest-950">
                Total: {formatCurrency(total)}
              </p>
            </div>
            {quote.notes && (
              <p className="mt-4 text-sm text-forest-950/70 whitespace-pre-wrap border-t border-border-subtle pt-3">
                {quote.notes}
              </p>
            )}
          </section>

          {quote.jobs.length > 0 && (
            <section className="card p-5">
              <h2 className="font-semibold text-forest-950 mb-3">Linked jobs</h2>
              <ul className="space-y-2">
                {quote.jobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 hover:bg-surface-muted/60"
                    >
                      <span className="text-sm font-medium">{j.title}</span>
                      <StatusBadge status={j.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-5 space-y-3 text-sm">
            <StatusBadge status={quote.status} />
            <div>
              <p className="text-xs text-forest-950/50">Customer</p>
              <Link href={`/customers/${quote.customerId}`} className="font-medium text-forest-700 hover:underline">
                {quote.customer.name}
              </Link>
            </div>
            {quote.property && (
              <div>
                <p className="text-xs text-forest-950/50">Property</p>
                <Link href={`/properties/${quote.property.id}`} className="font-medium text-forest-700 hover:underline">
                  {quote.property.label}
                </Link>
              </div>
            )}
            {quote.validUntil && (
              <div>
                <p className="text-xs text-forest-950/50">Valid until</p>
                <p>{formatDate(quote.validUntil)}</p>
              </div>
            )}
            {quote.status === "lost" && quote.lostReason && (
              <div>
                <p className="text-xs text-forest-950/50">Lost reason</p>
                <p>{quote.lostReason}</p>
              </div>
            )}
          </section>

          <section className="card p-5 space-y-2">
            <h2 className="font-semibold text-forest-950 mb-2 text-sm">Pipeline actions</h2>
            {quote.status === "draft" && (
              <form action={markSent}>
                <Button type="submit" className="w-full">
                  <Send size={14} /> Mark as sent
                </Button>
              </form>
            )}
            {(quote.status === "draft" || quote.status === "sent") && (
              <>
                <form action={markWon}>
                  <Button type="submit" variant="secondary" className="w-full">
                    <CheckCircle2 size={14} className="text-success" /> Mark won
                  </Button>
                </form>
                <form action={markLost} className="flex gap-2">
                  <input
                    name="lostReason"
                    placeholder="Reason lost (optional)"
                    className="flex-1 rounded-lg border border-border-subtle bg-surface px-2 py-2 text-xs"
                  />
                  <Button type="submit" variant="secondary">
                    <XCircle size={14} className="text-danger" /> Lost
                  </Button>
                </form>
              </>
            )}
            {quote.status === "won" && quote.jobs.length === 0 && (
              <form action={convert}>
                <Button type="submit" className="w-full">
                  <ArrowRightCircle size={14} /> Convert to job
                </Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
