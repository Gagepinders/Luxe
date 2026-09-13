import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { PageHeader } from "@/components/ui";
import PropertiesMap from "@/components/PropertiesMapField";
import { Map as MapIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [company, properties, customers] = await Promise.all([
    getCompanyProfile(),
    prisma.property.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        customerId: true,
        label: true,
        addressLine: true,
        city: true,
        state: true,
        zip: true,
        lat: true,
        lng: true,
        measurements: true,
        gateCode: true,
        accessNotes: true,
        hazards: true,
        customer: { select: { name: true, status: true } },
      },
    }),
    prisma.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pins = properties
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      customerId: p.customerId,
      customerName: p.customer.name,
      customerStatus: p.customer.status,
      label: p.label,
      addressLine: p.addressLine,
      city: p.city,
      state: p.state,
      zip: p.zip,
      lat: p.lat as number,
      lng: p.lng as number,
      measurements: p.measurements,
      gateCode: p.gateCode,
      accessNotes: p.accessNotes,
      hazards: p.hazards,
    }));

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Map"
        subtitle="Every property at a glance on high-res satellite imagery — search any address, measure it, and save it right here."
        icon={MapIcon}
      />
      <PropertiesMap
        properties={pins}
        hq={{ label: `${company.name} — HQ`, lat: company.lat, lng: company.lng }}
        customers={customers}
      />
    </main>
  );
}
