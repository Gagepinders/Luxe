import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

export const dynamic = "force-dynamic";

// One-time bootstrap: creates the first login account. Only works while the
// Users table is empty, so it can't be used to add more accounts later —
// use the Team page (once logged in) for that.
export async function POST(request: NextRequest) {
  const secret = process.env.SETUP_SECRET;
  const key = request.nextUrl.searchParams.get("key");

  if (!secret) {
    return NextResponse.json(
      { error: "Setup is disabled: SETUP_SECRET is not set on this deployment." },
      { status: 403 }
    );
  }
  if (key !== secret) {
    return NextResponse.json({ error: "Invalid or missing key." }, { status: 401 });
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "Setup already completed — an account already exists. Use the Team page to add more." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "Owner").trim();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });

  return NextResponse.json({ ok: true, email: user.email });
}
