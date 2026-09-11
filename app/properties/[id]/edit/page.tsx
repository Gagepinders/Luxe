import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import PropertyForm from "@/components/PropertyForm";
import { updateProperty } from "@/app/actions/properties";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, customers] = await Promise.all([
    prisma.property.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!property) notFound();

  const action = updateProperty.bind(null, id);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title={`Edit ${property.label}`} />
      <PropertyForm action={action} customers={customers} property={property} />
    </main>
  );
}
