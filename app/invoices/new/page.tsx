import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import InvoiceForm from "@/components/InvoiceForm";
import { createInvoice } from "@/app/actions/invoices";
import type { LineItemRow } from "@/components/QuoteLineItemsEditor";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; jobId?: string }>;
}) {
  const { customerId, jobId } = await searchParams;

  const [customers, jobs, serviceTypes, job] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.job.findMany({ select: { id: true, customerId: true, title: true, price: true } }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    jobId
      ? prisma.job.findUnique({ where: { id: jobId }, include: { serviceType: true } })
      : null,
  ]);

  const initialItems: LineItemRow[] = job
    ? [
        {
          key: "job-prefill",
          description: job.title,
          quantity: 1,
          unit: job.serviceType?.defaultUnit ?? "visit",
          unitPrice: job.price,
          serviceTypeId: job.serviceTypeId,
        },
      ]
    : [];

  return (
    <main className="p-6 md:p-8">
      <PageHeader title="New Invoice" />
      <InvoiceForm
        action={createInvoice}
        customers={customers}
        jobs={jobs}
        serviceTypes={serviceTypes}
        defaultCustomerId={customerId ?? job?.customerId}
        defaultJobId={jobId}
        initialItems={initialItems}
      />
    </main>
  );
}
