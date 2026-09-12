import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { formatCurrency, formatDate } from "@/lib/format";
import { respondToQuotePublic } from "@/app/actions/quotes";
import { Leaf, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [quote, company] = await Promise.all([
    prisma.quote.findUnique({
      where: { publicToken: token },
      include: {
        customer: true,
        property: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    getCompanyProfile(),
  ]);
  if (!quote) notFound();

  const total = quote.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const decided = quote.status === "won" || quote.status === "lost";
  const approve = respondToQuotePublic.bind(null, token, "won");
  const decline = respondToQuotePublic.bind(null, token, "lost");

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 text-forest-950">
              <Leaf size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-semibold text-forest-950">{company.name}</p>
              <p className="text-xs text-forest-950/50">
                {company.phone} · {company.email}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-forest-950">QUOTE</p>
            <p className="text-sm text-forest-950/60">#{quote.number}</p>
            {quote.validUntil && (
              <p className="text-xs text-forest-950/50">Valid until {formatDate(quote.validUntil)}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-forest-950/50">Prepared for</p>
            <p className="font-medium text-forest-950">{quote.customer.name}</p>
          </div>
          {quote.property && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-forest-950/50">Property</p>
              <p className="text-sm text-forest-950/70">{quote.property.addressLine}</p>
            </div>
          )}
        </div>

        {quote.title && <p className="text-sm font-medium text-forest-950">{quote.title}</p>}

        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-forest-950/50">
            <tr>
              <th className="pb-2">Description</th>
              <th className="pb-2 w-16">Qty</th>
              <th className="pb-2 w-24 text-right">Price</th>
              <th className="pb-2 w-24 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((li) => (
              <tr key={li.id} className="border-t border-border-subtle">
                <td className="py-2">{li.description}</td>
                <td className="py-2">
                  {li.quantity} {li.unit}
                </td>
                <td className="py-2 text-right">{formatCurrency(li.unitPrice)}</td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(li.quantity * li.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-border-subtle pt-3">
          <p className="text-lg font-semibold text-forest-950">Total: {formatCurrency(total)}</p>
        </div>

        {quote.notes && (
          <p className="text-sm text-forest-950/70 whitespace-pre-wrap border-t border-border-subtle pt-4">
            {quote.notes}
          </p>
        )}

        {decided ? (
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
              quote.status === "won" ? "bg-forest-700/10 text-forest-700" : "bg-danger-100 text-danger"
            }`}
          >
            {quote.status === "won" ? (
              <>
                <CheckCircle2 size={16} /> You approved this quote — we&apos;ll be in touch to
                schedule!
              </>
            ) : (
              <>
                <XCircle size={16} /> This quote was declined.
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 border-t border-border-subtle pt-5">
            <form action={approve} className="flex-1 min-w-[160px]">
              <button
                type="submit"
                className="w-full rounded-lg bg-forest-700 px-4 py-3 text-sm font-semibold text-white hover:bg-forest-800"
              >
                Approve this quote
              </button>
            </form>
            <form action={decline} className="flex-1 min-w-[160px]">
              <button
                type="submit"
                className="w-full rounded-lg border border-border-subtle px-4 py-3 text-sm font-semibold text-forest-950/70 hover:bg-surface-muted"
              >
                Decline
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-forest-950/35">
          Questions? Call {company.phone} or reply to the email that sent this link.
        </p>
      </div>
    </div>
  );
}
