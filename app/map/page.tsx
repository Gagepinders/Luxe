import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { PageHeader } from "@/components/ui";
import PropertiesMap from "@/components/PropertiesMapField";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [company, properties] = await Promise.all([
    getCompanyProfile(),
    prisma.property.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        label: true,
        addressLine: true,
        city: true,
        lat: true,
        lng: true,
        customer: { select: { name: true, status: true } },
      },
    }),
  ]);

  const pins = properties
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      customerName: p.customer.name,
      customerStatus: p.customer.status,
      label: p.label,
      addressLine: p.addressLine,
      city: p.city,
      lat: p.lat as number,
      lng: p.lng as number,
    }));

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Map"
        subtitle="Every property at a glance on high-res satellite imagery — search any address to find it."
      />
      <PropertiesMap
        properties={pins}
        hq={{ label: `${company.name} — HQ`, lat: company.lat, lng: company.lng }}
      />
    </main>
  );
}
