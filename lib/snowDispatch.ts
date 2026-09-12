import { prisma } from "@/lib/prisma";

export type SnowDispatchCandidate = {
  customerId: string;
  customerName: string;
  propertyId: string;
  propertyAddress: string;
  serviceTypeId: string | null;
  serviceTypeName: string;
  price: number;
  crew: string | null;
  title: string;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// "On the plow list" is inferred from history: any customer+property that
// has ever had a recurring snow-removal job. There's no separate flag to
// maintain — the moment you stop scheduling snow jobs for someone, they
// naturally drop off dispatch too.
export async function getSnowDispatchCandidates(): Promise<SnowDispatchCandidate[]> {
  const snowJobs = await prisma.job.findMany({
    where: { recurrence: { not: "none" }, serviceType: { category: "snow_removal" } },
    orderBy: { scheduledDate: "desc" },
    include: {
      customer: { select: { name: true } },
      property: { select: { addressLine: true, city: true } },
      serviceType: { select: { id: true, name: true } },
    },
  });

  const seen = new Set<string>();
  const candidates: SnowDispatchCandidate[] = [];
  for (const job of snowJobs) {
    const key = `${job.customerId}-${job.propertyId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      customerId: job.customerId,
      customerName: job.customer.name,
      propertyId: job.propertyId,
      propertyAddress: `${job.property.addressLine}${job.property.city ? `, ${job.property.city}` : ""}`,
      serviceTypeId: job.serviceTypeId,
      serviceTypeName: job.serviceType?.name ?? "Snow removal",
      price: job.price,
      crew: job.crew,
      title: job.title,
    });
  }

  const todaysJobs = await prisma.job.findMany({
    where: { scheduledDate: { gte: startOfToday(), lte: endOfToday() } },
    select: { customerId: true, propertyId: true, serviceTypeId: true },
  });
  const alreadyDispatchedToday = new Set(
    todaysJobs.map((j) => `${j.customerId}-${j.propertyId}-${j.serviceTypeId}`)
  );

  return candidates.filter(
    (c) => !alreadyDispatchedToday.has(`${c.customerId}-${c.propertyId}-${c.serviceTypeId}`)
  );
}
