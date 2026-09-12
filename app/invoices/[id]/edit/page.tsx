import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import InvoiceForm from "@/components/InvoiceForm";
import { updateInvoice } from "@/app/actions/invoices";
import type { LineItemRow } from "@/components/QuoteLineItemsEditor";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, customers, jobs, serviceTypes] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.job.findMany({ select: { id: true, customerId: true, title: true, price: true } }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();

  const initialItems: LineItemRow[] = invoice.lineItems.map((li) => ({
    key: li.id,
    description: li.description,
    quantity: li.quantity,
    unit: li.unit,
    unitPrice: li.unitPrice,
    serviceTypeId: null,
  }));

  const action = updateInvoice.bind(null, id);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title={`Edit Invoice #${invoice.number}`} />
      <InvoiceForm
        action={action}
        customers={customers}
        jobs={jobs}
        serviceTypes={serviceTypes}
        invoice={invoice}
        initialItems={initialItems}
      />
    </main>
  );
}
