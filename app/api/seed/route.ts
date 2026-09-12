import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seedDatabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const key = request.nextUrl.searchParams.get("key");

  if (!secret) {
    return NextResponse.json(
      { error: "Seeding is disabled: SEED_SECRET is not set on this deployment." },
      { status: 403 }
    );
  }

  if (key !== secret) {
    return NextResponse.json({ error: "Invalid or missing key." }, { status: 401 });
  }

  try {
    await seedDatabase(prisma);
    return NextResponse.json({
      ok: true,
      message: "Demo data loaded. Head back to the dashboard.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seeding failed." },
      { status: 500 }
    );
  }
}
