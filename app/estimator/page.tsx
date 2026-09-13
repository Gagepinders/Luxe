import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import EstimatorTool from "@/components/EstimatorTool";
import { Calculator } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EstimatorPage() {
  const [customers, properties, serviceTypes] = await Promise.all([
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
    prisma.serviceType.findMany({
      where: { active: true, defaultUnit: "sqft" },
      select: { id: true, name: true, defaultUnit: true, defaultRate: true },
    }),
  ]);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Estimator"
        subtitle="Quick ballpark pricing from a property's measured areas — for phone estimates."
        icon={Calculator}
      />
      <EstimatorTool customers={customers} properties={properties} serviceTypes={serviceTypes} />
    </main>
  );
}
