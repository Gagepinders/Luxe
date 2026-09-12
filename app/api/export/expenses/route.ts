import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

  const expenses = await prisma.jobExpense.findMany({
    where: year
      ? { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
      : {},
    include: { job: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = expenses.map((e) => [
    e.createdAt.toISOString().slice(0, 10),
    e.job.title,
    e.category,
    e.description,
    e.amount.toFixed(2),
  ]);

  const csv = toCsv(["Date", "Job", "Category", "Description", "Amount"], rows);
  return csvResponse(`expenses${year ? `-${year}` : ""}.csv`, csv);
}
