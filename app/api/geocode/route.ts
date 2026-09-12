import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

// Behind the normal login middleware — this proxies Nominatim server-side so
// we control the User-Agent header and avoid CORS issues from the browser.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await geocodeAddress(q);
  return NextResponse.json({ results });
}
