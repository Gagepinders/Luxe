import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import JobForm from "@/components/JobForm";
import { createJob } from "@/app/actions/jobs";

export const dynamic = "force-dynamic";

export default async function NewJobPage({
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
      <PageHeader title="Schedule Job" />
      <JobForm
        action={createJob}
        customers={customers}
        properties={properties}
        serviceTypes={serviceTypes}
        defaultCustomerId={customerId}
        defaultPropertyId={propertyId}
      />
    </main>
  );
}
