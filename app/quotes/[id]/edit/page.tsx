import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import QuoteForm from "@/components/QuoteForm";
import { updateQuote } from "@/app/actions/quotes";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, customers, properties, serviceTypes] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { lineItems: true } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.property.findMany({
      select: {
        id: true,
        customerId: true,
        label: true,
        addressLine: true,
        lawnSqft: true,
        driveSqft: true,
        walkwaySqft: true,
        mulchSqft: true,
      },
    }),
    prisma.serviceType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!quote) notFound();

  const action = updateQuote.bind(null, id);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title={`Edit Quote #${quote.number}`} />
      <QuoteForm
        action={action}
        customers={customers}
        properties={properties}
        serviceTypes={serviceTypes}
        quote={quote}
      />
    </main>
  );
}
