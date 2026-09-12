import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import PropertyForm from "@/components/PropertyForm";
import { createProperty } from "@/app/actions/properties";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; address?: string; lat?: string; lng?: string }>;
}) {
  const { customerId, address, lat, lng } = await searchParams;
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="p-6 md:p-8">
      <PageHeader title="New Property" />
      <PropertyForm
        action={createProperty}
        customers={customers}
        defaultCustomerId={customerId}
        defaultAddress={address}
        defaultLat={lat ? Number(lat) : undefined}
        defaultLng={lng ? Number(lng) : undefined}
      />
    </main>
  );
}
