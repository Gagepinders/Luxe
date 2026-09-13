import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatusBadge, SectionHeader } from "@/components/ui";
import { formatSqft, formatDateShort } from "@/lib/format";
import PropertyMap, { type Measurement } from "@/components/PropertyMapField";
import { deleteProperty } from "@/app/actions/properties";
import { Pencil, Trash2, Plus, MapPinned, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      customer: true,
      jobs: { orderBy: { scheduledDate: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!property) notFound();

  let measurements: Measurement[] = [];
  if (property.measurements) {
    try {
      measurements = JSON.parse(property.measurements);
    } catch {
      measurements = [];
    }
  }

  const deleteAction = deleteProperty.bind(null, id, property.customerId);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={property.label}
        subtitle={`${property.addressLine}, ${property.city}, ${property.state} ${property.zip}`}
        icon={MapPinned}
        action={
          <div className="flex gap-2">
            <Button href={`/properties/${id}/edit`} variant="secondary">
              <Pencil size={14} /> Edit
            </Button>
            <form action={deleteAction}>
              <Button type="submit" variant="danger">
                <Trash2 size={14} /> Delete
              </Button>
            </form>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <PropertyMap
            initialLat={property.lat ?? 0}
            initialLng={property.lng ?? 0}
            initialMeasurements={measurements}
            hiddenInputName="mapPayload"
            readOnly
          />
        </div>

        <div className="space-y-6">
          <section className="card p-5 space-y-2 text-sm">
            <p className="text-xs text-forest-950/50 uppercase tracking-wide">Customer</p>
            <Link href={`/customers/${property.customerId}`} className="font-medium text-forest-700 hover:underline">
              {property.customer.name}
            </Link>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
              <div>
                <p className="text-xs text-forest-950/50">Lawn</p>
                <p className="font-medium">{formatSqft(property.lawnSqft)}</p>
              </div>
              <div>
                <p className="text-xs text-forest-950/50">Driveway</p>
                <p className="font-medium">{formatSqft(property.driveSqft)}</p>
              </div>
              <div>
                <p className="text-xs text-forest-950/50">Walkway</p>
                <p className="font-medium">{formatSqft(property.walkwaySqft)}</p>
              </div>
              <div>
                <p className="text-xs text-forest-950/50">Mulch beds</p>
                <p className="font-medium">{formatSqft(property.mulchSqft)}</p>
              </div>
              <div>
                <p className="text-xs text-forest-950/50">Total acres</p>
                <p className="font-medium">{property.totalAcres?.toFixed(2) ?? "—"}</p>
              </div>
            </div>
            {measurements.some((m) => m.type === "obstacle") && (
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-xs text-forest-950/50 mb-1">Obstacles</p>
                <div className="flex flex-wrap gap-1.5">
                  {measurements
                    .filter((m) => m.type === "obstacle")
                    .map((m) => (
                      <span key={m.id} className="badge bg-danger-100 text-danger">
                        {m.label}
                      </span>
                    ))}
                </div>
              </div>
            )}
            {(property.gateCode || property.hazards || property.accessNotes) && (
              <div className="pt-2 border-t border-border-subtle space-y-1">
                {property.gateCode && (
                  <p><span className="text-forest-950/50">Gate code:</span> {property.gateCode}</p>
                )}
                {property.hazards && (
                  <p><span className="text-forest-950/50">Hazards:</span> {property.hazards}</p>
                )}
                {property.accessNotes && (
                  <p className="text-forest-950/70">{property.accessNotes}</p>
                )}
              </div>
            )}
          </section>

          <section className="card p-5">
            <SectionHeader
              title="Jobs"
              icon={CalendarClock}
              tone="gold"
              action={
                <Button href={`/jobs/new?propertyId=${id}&customerId=${property.customerId}`} size="sm" variant="secondary">
                  <Plus size={14} /> New job
                </Button>
              }
            />
            {property.jobs.length === 0 ? (
              <p className="text-sm text-forest-950/50">No jobs yet.</p>
            ) : (
              <ul className="space-y-2">
                {property.jobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 hover:bg-surface-muted/60"
                    >
                      <span className="text-sm font-medium">{j.title}</span>
                      <span className="flex items-center gap-3 text-xs text-forest-950/60">
                        {formatDateShort(j.scheduledDate)}
                        <StatusBadge status={j.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
