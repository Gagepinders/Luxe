import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, EmptyState } from "@/components/ui";
import { formatSqft } from "@/lib/format";
import { Plus, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    include: { customer: { select: { name: true } }, jobs: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalAcres = properties.reduce((s, p) => s + (p.totalAcres ?? 0), 0);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties · ${totalAcres.toFixed(1)} acres tracked`}
        action={
          <Button href="/properties/new">
            <Plus size={16} /> New Property
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add a property to a customer to measure lawns, driveways, and plan routes."
          action={
            <Button href="/properties/new">
              <Plus size={16} /> New Property
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-forest-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-forest-950">{p.label}</p>
                  <p className="text-sm text-forest-950/60">{p.addressLine}</p>
                  <p className="text-xs text-forest-950/50">{p.customer.name}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-3 text-xs text-forest-950/60">
                <span>Lawn: {formatSqft(p.lawnSqft)}</span>
                <span>Jobs: {p.jobs.length}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
