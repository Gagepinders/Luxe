import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { PageHeader, Button, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { setInvoiceStatus, deleteInvoice, sendInvoiceToCustomer } from "@/app/actions/invoices";
import { getAppUrl } from "@/lib/appUrl";
import PrintButton from "@/components/PrintButton";
import { Pencil, Trash2, Send, CheckCircle2, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
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
  const effectiveStatus = isOverdue ? "overdue" : invoice.status;

  const markSent = setInvoiceStatus.bind(null, id, "sent");
  const markPaid = setInvoiceStatus.bind(null, id, "paid");
  const markDraft = setInvoiceStatus.bind(null, id, "draft");
  const sendToCustomer = sendInvoiceToCustomer.bind(null, id);
  const publicLink = invoice.publicToken ? `${getAppUrl()}/i/${invoice.publicToken}` : null;
  const remove = deleteInvoice.bind(null, id);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={`Invoice #${invoice.number}`}
        subtitle={effectiveStatus}
        action={
          <div className="no-print flex flex-wrap gap-2">
            <PrintButton />
            <Button href={`/invoices/${id}/edit`} variant="secondary">
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
        <div className="lg:col-span-2">
          <section className="printable card p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-6">
              <div>
                <p className="text-lg font-semibold text-forest-950">{company.name}</p>
                <p className="text-sm text-forest-950/60">
                  {company.addressLine}, {company.city}, {company.state} {company.zip}
                </p>
                <p className="text-sm text-forest-950/60">{company.phone} · {company.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-forest-950">INVOICE</p>
                <p className="text-sm text-forest-950/60">#{invoice.number}</p>
                <p className="text-sm text-forest-950/60">Issued {formatDate(invoice.issuedAt)}</p>
                {invoice.dueAt && (
                  <p className="text-sm text-forest-950/60">Due {formatDate(invoice.dueAt)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-forest-950/50">Bill to</p>
                <p className="font-medium text-forest-950">{invoice.customer.name}</p>
                {invoice.customer.companyName && (
                  <p className="text-sm text-forest-950/60">{invoice.customer.companyName}</p>
                )}
                {invoice.customer.email && (
                  <p className="text-sm text-forest-950/60">{invoice.customer.email}</p>
                )}
                {invoice.customer.phone && (
                  <p className="text-sm text-forest-950/60">{invoice.customer.phone}</p>
                )}
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
                  <th className="pb-2 w-16">Unit</th>
                  <th className="pb-2 w-24 text-right">Price</th>
                  <th className="pb-2 w-24 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
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
            <div className="flex justify-end border-t border-border-subtle pt-3">
              <p className="text-lg font-semibold text-forest-950">
                Total due: {formatCurrency(total)}
              </p>
            </div>
            {invoice.notes && (
              <p className="text-sm text-forest-950/70 whitespace-pre-wrap border-t border-border-subtle pt-4">
                {invoice.notes}
              </p>
            )}
            {invoice.status === "paid" && invoice.paidAt && (
              <p className="text-sm font-medium text-success">
                Paid in full on {formatDate(invoice.paidAt)}. Thank you!
              </p>
            )}
          </section>
        </div>

        <div className="no-print space-y-3">
          <section className="card p-5 space-y-3 text-sm">
            <StatusBadge status={effectiveStatus} />
            <div>
              <p className="text-xs text-forest-950/50">Customer</p>
              <Link href={`/customers/${invoice.customerId}`} className="font-medium text-forest-700 hover:underline">
                {invoice.customer.name}
              </Link>
            </div>
            {invoice.job && (
              <div>
                <p className="text-xs text-forest-950/50">Job</p>
                <Link href={`/jobs/${invoice.job.id}`} className="font-medium text-forest-700 hover:underline">
                  {invoice.job.title}
                </Link>
              </div>
            )}
          </section>

          <section className="card p-5 space-y-2">
            <h2 className="font-semibold text-forest-950 mb-2 text-sm">Actions</h2>
            {invoice.status !== "paid" && (
              <form action={sendToCustomer}>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!invoice.customer.email}
                  title={!invoice.customer.email ? "Add an email for this customer first" : undefined}
                >
                  <Send size={14} /> {invoice.status === "draft" ? "Email" : "Re-send"} invoice to
                  customer
                </Button>
              </form>
            )}
            {publicLink && (
              <a
                href={publicLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-forest-700 hover:underline px-1"
              >
                <Link2 size={12} /> View customer-facing link
              </a>
            )}
            {invoice.status === "draft" && (
              <form action={markSent}>
                <Button type="submit" variant="secondary" className="w-full">
                  Mark as sent (no email)
                </Button>
              </form>
            )}
            {(invoice.status === "sent" || isOverdue) && (
              <form action={markPaid}>
                <Button type="submit" variant="secondary" className="w-full">
                  <CheckCircle2 size={14} className="text-success" /> Mark paid
                </Button>
              </form>
            )}
            {invoice.status !== "draft" && (
              <form action={markDraft}>
                <Button type="submit" variant="secondary" className="w-full">
                  Revert to draft
                </Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
