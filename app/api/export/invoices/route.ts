import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Protected by the normal login middleware — an authenticated download, not
// a public integration endpoint.
export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "paid",
      ...(year
        ? { paidAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        : {}),
    },
    include: { customer: { select: { name: true } }, lineItems: true },
    orderBy: { paidAt: "asc" },
  });

  const rows = invoices.map((inv) => {
    const total = inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    return [
      inv.number,
      inv.customer.name,
      inv.issuedAt.toISOString().slice(0, 10),
      inv.paidAt ? inv.paidAt.toISOString().slice(0, 10) : "",
      total.toFixed(2),
    ];
  });

  const csv = toCsv(["Invoice #", "Customer", "Issued", "Paid", "Amount"], rows);
  return csvResponse(`invoices${year ? `-${year}` : ""}.csv`, csv);
}
