import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, EmptyState, StatCard } from "@/components/ui";
import { formatSqft } from "@/lib/format";
import { Plus, MapPin, Ruler, Home } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    include: { customer: { select: { name: true } }, jobs: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalAcres = properties.reduce((s, p) => s + (p.totalAcres ?? 0), 0);
  const measuredCount = properties.filter((p) => p.lawnSqft && p.lawnSqft > 0).length;
  const totalLawnSqft = properties.reduce((s, p) => s + (p.lawnSqft ?? 0), 0);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties · ${totalAcres.toFixed(1)} acres tracked`}
        icon={MapPin}
        action={
          <Button href="/properties/new">
            <Plus size={16} /> New Property
          </Button>
        }
      />

      {properties.length > 0 && (
        <div className="stagger-in grid grid-cols-3 gap-4 mb-6">
          <StatCard icon={Home} label="Total properties" value={String(properties.length)} tone="forest" />
          <StatCard icon={Ruler} label="Acres tracked" value={totalAcres.toFixed(1)} tone="gold" />
          <StatCard
            icon={MapPin}
            label="Measured"
            value={String(measuredCount)}
            tone="ice"
            hint={totalLawnSqft > 0 ? `${formatSqft(totalLawnSqft)} lawn total` : undefined}
          />
        </div>
      )}

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
        <div className="stagger-in grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="card card-interactive p-4"
            >
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-forest-100 to-forest-100/60 text-forest-700">
                  <MapPin size={15} />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-forest-950 truncate">{p.label}</p>
                  <p className="text-sm text-forest-950/60 truncate">{p.addressLine}</p>
                  <p className="text-xs text-forest-950/50 truncate">{p.customer.name}</p>
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
