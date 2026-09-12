import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Protected by the normal login middleware (not secret-gated) — this is an
// authenticated in-app search, not a public integration endpoint.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const numeric = Number(q.replace(/^#/, ""));
  const isNumeric = !Number.isNaN(numeric) && q.replace(/^#/, "").length > 0;

  const [customers, properties, quotes, jobs, invoices] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { companyName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, companyName: true },
      take: 5,
    }),
    prisma.property.findMany({
      where: {
        OR: [{ addressLine: { contains: q } }, { label: { contains: q } }, { city: { contains: q } }],
      },
      select: { id: true, label: true, addressLine: true, customer: { select: { name: true } } },
      take: 5,
    }),
    prisma.quote.findMany({
      where: isNumeric
        ? { number: numeric }
        : { OR: [{ title: { contains: q } }, { customer: { name: { contains: q } } }] },
      select: { id: true, number: true, title: true, customer: { select: { name: true } } },
      take: 5,
    }),
    prisma.job.findMany({
      where: {
        OR: [{ title: { contains: q } }, { customer: { name: { contains: q } } }],
      },
      select: { id: true, title: true, customer: { select: { name: true } } },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: isNumeric
        ? { number: numeric }
        : { customer: { name: { contains: q } } },
      select: { id: true, number: true, customer: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    results: {
      customers: customers.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.companyName ?? undefined,
        href: `/customers/${c.id}`,
      })),
      properties: properties.map((p) => ({
        id: p.id,
        label: p.label,
        sublabel: `${p.addressLine} — ${p.customer.name}`,
        href: `/properties/${p.id}`,
      })),
      quotes: quotes.map((q2) => ({
        id: q2.id,
        label: `#${q2.number} ${q2.title ?? ""}`.trim(),
        sublabel: q2.customer.name,
        href: `/quotes/${q2.id}`,
      })),
      jobs: jobs.map((j) => ({
        id: j.id,
        label: j.title,
        sublabel: j.customer.name,
        href: `/jobs/${j.id}`,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        label: `#${i.number}`,
        sublabel: i.customer.name,
        href: `/invoices/${i.id}`,
      })),
    },
  });
}
