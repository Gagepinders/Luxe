export type GeocodeResult = {
  displayName: string;
  lat: number;
  lng: number;
};

// Two free, no-API-key geocoders, tried in order:
// 1. US Census — built specifically for exact US street addresses (house-
//    number precise via TIGER/Line data), which is what a landscaping
//    business searches for almost every time.
// 2. Nominatim (OpenStreetMap) — broader coverage (landmarks, towns,
//    non-US), used as a fallback when Census finds no match.
async function geocodeCensus(query: string): Promise<GeocodeResult[]> {
  try {
    const url =
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress` +
      `?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const matches = data?.result?.addressMatches;
    if (!Array.isArray(matches)) return [];

    return matches
      .map((m: { matchedAddress?: string; coordinates?: { x?: number; y?: number } }) => ({
        displayName: m.matchedAddress ?? "",
        lat: Number(m.coordinates?.y),
        lng: Number(m.coordinates?.x),
      }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  } catch {
    return [];
  }
}

async function geocodeNominatim(query: string): Promise<GeocodeResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LuxeLandscapeCRM/1.0 (internal tool; contact: gagepinders23@gmail.com)",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((d: { display_name?: string; lat?: string; lon?: string }) => ({
        displayName: d.display_name ?? "",
        lat: Number(d.lat),
        lng: Number(d.lon),
      }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  } catch {
    return [];
  }
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const censusResults = await geocodeCensus(trimmed);
  if (censusResults.length > 0) return censusResults;

  return geocodeNominatim(trimmed);
}
