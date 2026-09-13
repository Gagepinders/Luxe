import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, SectionHeader, Field, inputClass, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createTodo, toggleTodo, deleteTodo } from "@/app/actions/todos";
import {
  ListChecks,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Circle,
  CheckCircle2,
  Trash2,
  Plus,
  Inbox,
} from "lucide-react";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type TodoRow = Awaited<ReturnType<typeof getTodos>>["open"][number];

async function getTodos() {
  const [open, recentlyCompleted, customers] = await Promise.all([
    prisma.todo.findMany({
      where: { completed: false },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.todo.findMany({
      where: { completed: true },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { open, recentlyCompleted, customers };
}

export default async function TodosPage() {
  const { open, recentlyCompleted, customers } = await getTodos();

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow);
  const upcoming = open.filter((t) => t.dueDate && t.dueDate >= tomorrow);
  const noDate = open.filter((t) => !t.dueDate);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="To-Dos"
        subtitle={`${open.length} open task${open.length === 1 ? "" : "s"}`}
        icon={ListChecks}
      />

      <div className="stagger-in grid grid-cols-3 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={String(overdue.length)}
          tone={overdue.length > 0 ? "danger" : "forest"}
        />
        <StatCard
          icon={CalendarClock}
          label="Due today"
          value={String(dueToday.length)}
          tone={dueToday.length > 0 ? "gold" : "forest"}
        />
        <StatCard icon={CalendarDays} label="Upcoming" value={String(upcoming.length)} tone="ice" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <TodoGroup title="Overdue" items={overdue} tone="danger" />
          <TodoGroup title="Due today" items={dueToday} tone="warning" />
          <TodoGroup title="Upcoming" items={upcoming} />
          <TodoGroup title="No due date" items={noDate} />

          {open.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="Nothing on your list"
              description="Add a task below — a follow-up call, an order to place, a quote to send."
            />
          )}

          {recentlyCompleted.length > 0 && (
            <div className="card p-5">
              <SectionHeader title="Recently completed" icon={CheckCircle2} tone="forest" />
              <ul className="space-y-1.5">
                {recentlyCompleted.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <form action={toggleTodo.bind(null, t.id, false)}>
                        <button
                          type="submit"
                          className="flex-shrink-0 text-forest-600 hover:text-forest-800"
                          title="Mark not done"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </form>
                      <span className="truncate text-forest-950/50 line-through">{t.title}</span>
                    </div>
                    {t.completedAt && (
                      <span className="text-xs text-forest-950/35 shrink-0">{formatDate(t.completedAt)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card p-5 h-fit">
          <SectionHeader title="Add a task" icon={Plus} tone="gold" />
          <form action={createTodo} className="space-y-3">
            <Field label="What needs doing?">
              <input name="title" required className={inputClass} placeholder="Order more mulch" />
            </Field>
            <Field label="Due date (optional)">
              <input type="date" name="dueDate" className={inputClass} />
            </Field>
            <Field label="Related customer (optional)">
              <select name="customerId" defaultValue="" className={inputClass}>
                <option value="">None</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <input name="notes" className={inputClass} placeholder="Extra detail…" />
            </Field>
            <button
              type="submit"
              className="w-full rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
            >
              Add task
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function TodoGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: TodoRow[];
  tone?: "danger" | "warning";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-forest-950/70";
  const chipClass =
    tone === "danger" ? "bg-danger-100 text-danger" : tone === "warning" ? "bg-warning-100 text-warning" : "bg-forest-100 text-forest-700";

  return (
    <div className="card p-5">
      <h2 className={`flex items-center gap-2.5 font-semibold mb-3 text-sm ${toneClass}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chipClass}`}>
          <ListChecks size={13} />
        </span>
        {title} ({items.length})
      </h2>
      <ul className="space-y-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <form action={toggleTodo.bind(null, t.id, true)}>
                <button
                  type="submit"
                  className="flex-shrink-0 text-forest-950/30 hover:text-forest-700"
                  title="Mark done"
                >
                  <Circle size={17} />
                </button>
              </form>
              <div className="min-w-0">
                <p className="font-medium text-sm text-forest-950 truncate">{t.title}</p>
                <p className="text-xs text-forest-950/50 truncate">
                  {t.dueDate && `Due ${formatDate(t.dueDate)}`}
                  {t.dueDate && t.customer && " · "}
                  {t.customer && (
                    <Link href={`/customers/${t.customer.id}`} className="hover:underline">
                      {t.customer.name}
                    </Link>
                  )}
                  {t.notes && ` — ${t.notes}`}
                </p>
              </div>
            </div>
            <form action={deleteTodo.bind(null, t.id)}>
              <button
                type="submit"
                className="flex-shrink-0 rounded-lg p-1.5 text-forest-950/30 hover:bg-danger-100 hover:text-danger"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
