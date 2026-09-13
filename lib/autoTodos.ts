import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";

// Live-computed "things that need doing" pulled from real records —
// quotes awaiting an answer, today's jobs, overdue invoices, low stock,
// overdue equipment service — so the To-Dos page doesn't rely on someone
// remembering to log a manual reminder for something the CRM already knows.
// These aren't stored or checked off: they resolve themselves once the
// underlying record changes (quote decided, invoice paid, job completed,
// stock restocked, equipment serviced).

export type AutoTodoSource = "quote" | "job" | "invoice" | "material" | "equipment";

export type AutoTodoItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  source: AutoTodoSource;
  bucket: "overdue" | "today";
};

function daysAgo(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getAutoTodos(): Promise<AutoTodoItem[]> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [sentQuotes, jobsToday, overdueInvoices, materials, equipment] = await Promise.all([
    prisma.quote.findMany({
      where: { status: "sent" },
      select: { id: true, number: true, title: true, sentAt: true, customer: { select: { name: true } } },
    }),
    prisma.job.findMany({
      where: { scheduledDate: { gte: todayStart, lt: todayEnd }, status: { in: ["scheduled", "in_progress"] } },
      select: { id: true, title: true, startTime: true, customer: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: "overdue" },
      include: { lineItems: true, customer: { select: { name: true } } },
    }),
    prisma.materialStock.findMany(),
    prisma.equipment.findMany({ where: { status: { not: "retired" } } }),
  ]);

  const items: AutoTodoItem[] = [];

  for (const q of sentQuotes) {
    if (!q.sentAt) continue;
    const age = daysAgo(q.sentAt);
    if (age < 1) continue; // sent today — too soon to chase
    items.push({
      id: `quote-${q.id}`,
      title: `Follow up on Quote #${q.number}${q.title ? ` — ${q.title}` : ""}`,
      detail: `Sent to ${q.customer.name} ${age} day${age === 1 ? "" : "s"} ago, no answer yet`,
      href: `/quotes/${q.id}`,
      source: "quote",
      bucket: age >= 3 ? "overdue" : "today",
    });
  }

  for (const j of jobsToday) {
    items.push({
      id: `job-${j.id}`,
      title: `Job today: ${j.title}`,
      detail: `${j.customer.name}${j.startTime ? ` at ${j.startTime}` : ""}`,
      href: `/jobs/${j.id}`,
      source: "job",
      bucket: "today",
    });
  }

  for (const inv of overdueInvoices) {
    const total = inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    items.push({
      id: `invoice-${inv.id}`,
      title: `Payment overdue: Invoice #${inv.number}`,
      detail: `${inv.customer.name} — ${formatCurrency(total)}`,
      href: `/invoices/${inv.id}`,
      source: "invoice",
      bucket: "overdue",
    });
  }

  for (const m of materials) {
    if (m.quantity > m.lowStockAt) continue;
    items.push({
      id: `material-${m.id}`,
      title: `Order more ${m.name}`,
      detail: `${m.quantity.toLocaleString()} ${m.unit} left`,
      href: "/inventory",
      source: "material",
      bucket: "today",
    });
  }

  for (const e of equipment) {
    if (!e.nextServiceDue) continue;
    if (e.nextServiceDue < now) {
      items.push({
        id: `equipment-${e.id}`,
        title: `Service overdue: ${e.name}`,
        detail: `Was due ${formatDate(e.nextServiceDue)}`,
        href: "/inventory",
        source: "equipment",
        bucket: "overdue",
      });
    } else if (e.nextServiceDue <= soon) {
      items.push({
        id: `equipment-${e.id}`,
        title: `Service due soon: ${e.name}`,
        detail: `Due ${formatDate(e.nextServiceDue)}`,
        href: "/inventory",
        source: "equipment",
        bucket: "today",
      });
    }
  }

  return items;
}
