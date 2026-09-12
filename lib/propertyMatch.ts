import { prisma } from "@/lib/prisma";
import type { InstantQuoteService } from "@/lib/pricing";

function normalizeAddress(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Finds a property someone (the owner) has already measured, so the public
// instant-quote page never has to ask a visitor to trace their own lawn or
// driveway — there's no self-reported measurement to under-report.
export async function findMeasuredProperty(addressLine: string, service: InstantQuoteService) {
  const target = normalizeAddress(addressLine);
  if (!target) return null;

  const candidates = await prisma.property.findMany({
    where: service === "mowing" ? { lawnSqft: { gt: 0 } } : { driveSqft: { gt: 0 } },
    select: { id: true, customerId: true, addressLine: true, lawnSqft: true, driveSqft: true },
  });

  return candidates.find((p) => normalizeAddress(p.addressLine) === target) ?? null;
}
