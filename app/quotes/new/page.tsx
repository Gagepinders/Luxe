import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import QuoteForm from "@/components/QuoteForm";
import { createQuote } from "@/app/actions/quotes";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; propertyId?: string }>;
}) {
  const { customerId, propertyId } = await searchParams;
  const [customers, properties, serviceTypes] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.property.findMany({
      select: { id: true, customerId: true, label: true, addressLine: true },
    }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title="New Quote" />
      <QuoteForm
        action={createQuote}
        customers={customers}
        properties={properties}
        serviceTypes={serviceTypes}
        defaultCustomerId={customerId}
        defaultPropertyId={propertyId}
      />
    </main>
  );
}
