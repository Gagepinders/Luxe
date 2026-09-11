import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import RoutePlanner, { type RouteStop } from "@/components/RoutePlanner";
import { format, addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const dayStr = date ?? format(new Date(), "yyyy-MM-dd");
  const dayStart = new Date(`${dayStr}T00:00:00`);
  const dayEnd = new Date(`${dayStr}T23:59:59`);

  const jobs = await prisma.job.findMany({
    where: {
      scheduledDate: { gte: dayStart, lte: dayEnd },
      status: { not: "cancelled" },
    },
    include: { customer: true, property: true },
    orderBy: [{ routeOrder: "asc" }, { createdAt: "asc" }],
  });

  const mapped = jobs.filter((j) => j.property.lat !== null && j.property.lng !== null);
  const missingCount = jobs.length - mapped.length;

  const stops: RouteStop[] = mapped.map((j) => ({
    id: j.id,
    title: j.title,
    customerName: j.customer.name,
    address: `${j.property.addressLine}, ${j.property.city}`,
    lat: j.property.lat as number,
    lng: j.property.lng as number,
    price: j.price,
    crew: j.crew,
    status: j.status,
  }));

  const prevDay = format(addDays(dayStart, -1), "yyyy-MM-dd");
  const nextDay = format(addDays(dayStart, 1), "yyyy-MM-dd");

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Routes"
        subtitle="Plan and optimize today's driving route between jobs"
      />

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/routes?date=${prevDay}`} className="text-sm text-forest-700 hover:underline">
          ← Prev day
        </Link>
        <form method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={dayStr}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm hover:bg-surface-muted"
          >
            Go
          </button>
        </form>
        <Link href={`/routes?date=${nextDay}`} className="text-sm text-forest-700 hover:underline">
          Next day →
        </Link>
      </div>

      <RoutePlanner stops={stops} missingCount={missingCount} />
    </main>
  );
}
