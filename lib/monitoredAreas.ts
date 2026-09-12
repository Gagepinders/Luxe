import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import type { MonitoredArea } from "@/lib/weather";

// One area per distinct property town, plus HQ — so the whole service area
// gets its own forecast instead of just the home office's.
export async function getMonitoredAreas(): Promise<MonitoredArea[]> {
  const [company, properties] = await Promise.all([
    getCompanyProfile(),
    prisma.property.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: { city: true, lat: true, lng: true },
    }),
  ]);

  const byCity = new Map<string, { lat: number; lng: number; count: number }>();
  for (const p of properties) {
    if (p.lat == null || p.lng == null) continue;
    const key = (p.city || "").trim();
    if (!key) continue;
    const existing = byCity.get(key);
    if (existing) existing.count += 1;
    else byCity.set(key, { lat: p.lat, lng: p.lng, count: 1 });
  }

  const hq: MonitoredArea = {
    key: "hq",
    label: `${company.city} (HQ)`,
    lat: company.lat,
    lng: company.lng,
    propertyCount: 0,
  };

  const areas: MonitoredArea[] = [hq];
  for (const [city, v] of byCity) {
    if (city.toLowerCase() === company.city.toLowerCase()) {
      hq.propertyCount += v.count;
      continue;
    }
    areas.push({
      key: city.toLowerCase().replace(/\s+/g, "-"),
      label: city,
      lat: v.lat,
      lng: v.lng,
      propertyCount: v.count,
    });
  }

  return areas;
}
