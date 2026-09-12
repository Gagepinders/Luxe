import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public, secret-gated endpoint that turns a website contact-form submission
// into a new lead in the pipeline. Called by a small sync script running on
// the Hostinger site — see hostinger/sync-leads.php.
export async function POST(request: NextRequest) {
  const secret = process.env.LEADS_API_KEY;
  const key = request.nextUrl.searchParams.get("key");

  if (!secret) {
    return NextResponse.json(
      { error: "Lead capture is disabled: LEADS_API_KEY is not set on this deployment." },
      { status: 403 }
    );
  }
  if (key !== secret) {
    return NextResponse.json({ error: "Invalid or missing key." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name =
    [str(body.first_name), str(body.last_name)].filter(Boolean).join(" ").trim() || str(body.name);
  const email = str(body.email) || null;
  const phone = str(body.phone) || null;
  const address = str(body.address);
  const propertyType = str(body.property_type).toLowerCase();
  const type = propertyType.includes("commercial") ? "commercial" : "residential";

  if (!name && !email && !phone) {
    return NextResponse.json({ error: "Submission has no name, email, or phone." }, { status: 400 });
  }

  const detailLines: string[] = [];
  const services = body.services;
  if (services) {
    detailLines.push(`Services requested: ${Array.isArray(services) ? services.join(", ") : services}`);
  }
  if (str(body.service_other)) detailLines.push(`Other service: ${str(body.service_other)}`);
  if (str(body.urgency)) detailLines.push(`Urgency: ${str(body.urgency)}`);
  if (str(body.preferred_day)) detailLines.push(`Preferred day: ${str(body.preferred_day)}`);
  if (str(body.preferred_time)) detailLines.push(`Preferred time: ${str(body.preferred_time)}`);
  if (str(body.description)) detailLines.push(`Description: ${str(body.description)}`);
  if (str(body.notes)) detailLines.push(`Notes: ${str(body.notes)}`);
  if (address) detailLines.push(`Address: ${address}`);
  if (str(body.page_url)) detailLines.push(`Submitted from: ${str(body.page_url)}`);
  const detailText = detailLines.join("\n");

  const existing = email ? await prisma.customer.findFirst({ where: { email } }) : null;

  let customer;
  if (existing) {
    customer = existing;
    await prisma.activity.create({
      data: {
        customerId: customer.id,
        type: "note",
        body: `Submitted the website contact form again.\n${detailText}`,
      },
    });
  } else {
    customer = await prisma.customer.create({
      data: {
        name: name || "Website lead",
        email,
        phone,
        type,
        status: "lead",
        pipelineStage: "new",
        source: "website",
        notes: detailText || null,
      },
    });
    await prisma.activity.create({
      data: {
        customerId: customer.id,
        type: "note",
        body: `New lead from the website contact form.\n${detailText}`,
      },
    });
    if (address) {
      await prisma.property.create({
        data: { customerId: customer.id, label: "Main Property", addressLine: address },
      });
    }
  }

  return NextResponse.json({ ok: true, customerId: customer.id });
}
