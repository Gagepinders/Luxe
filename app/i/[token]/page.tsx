import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { formatCurrency, formatDate } from "@/lib/format";
import { Leaf, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { publicToken: token },
      include: {
        customer: true,
        job: { include: { property: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    getCompanyProfile(),
  ]);
  if (!invoice) notFound();

  const total = invoice.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const isOverdue = invoice.status === "sent" && invoice.dueAt && invoice.dueAt < new Date();

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
            <p className="text-lg font-bold text-forest-950">INVOICE</p>
            <p className="text-sm text-forest-950/60">#{invoice.number}</p>
            <p className="text-xs text-forest-950/50">Issued {formatDate(invoice.issuedAt)}</p>
            {invoice.dueAt && (
              <p className={`text-xs ${isOverdue ? "text-danger font-medium" : "text-forest-950/50"}`}>
                Due {formatDate(invoice.dueAt)}
                {isOverdue ? " — overdue" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-forest-950/50">Bill to</p>
            <p className="font-medium text-forest-950">{invoice.customer.name}</p>
          </div>
          {invoice.job && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-forest-950/50">Property</p>
              <p className="text-sm text-forest-950/70">{invoice.job.property.addressLine}</p>
            </div>
          )}
        </div>

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
            {invoice.lineItems.map((li) => (
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
          <p className="text-lg font-semibold text-forest-950">Total due: {formatCurrency(total)}</p>
        </div>

        {invoice.notes && (
          <p className="text-sm text-forest-950/70 whitespace-pre-wrap border-t border-border-subtle pt-4">
            {invoice.notes}
          </p>
        )}

        {invoice.status === "paid" ? (
          <div className="flex items-center gap-2 rounded-lg bg-forest-700/10 px-4 py-3 text-sm font-medium text-forest-700">
            <CheckCircle2 size={16} /> Paid in full{invoice.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ""}.
            Thank you!
          </div>
        ) : (
          <div className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-forest-950/70">
            To pay, call {company.phone} or reply to the email that sent this link.
          </div>
        )}

        <p className="text-center text-xs text-forest-950/35">
          Questions? Call {company.phone} or email {company.email}.
        </p>
      </div>
    </div>
  );
}
