import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, EmptyState } from "@/components/ui";
import StatusDropdown from "@/components/StatusDropdown";
import { setJobStatus } from "@/app/actions/jobs";
import { JOB_STATUS_OPTIONS } from "@/lib/statusOptions";
import { formatDateShort, formatCurrency } from "@/lib/format";
import { Plus, LayoutList, CalendarDays } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; month?: string }>;
}) {
  const { view = "list", status, month } = await searchParams;

  const jobs = await prisma.job.findMany({
    where: status ? { status } : {},
    include: { customer: true, property: true },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
        action={
          <Button href="/jobs/new">
            <Plus size={16} /> Schedule Job
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 border border-border-subtle rounded-lg p-1">
          <Link
            href={`/jobs?view=list${status ? `&status=${status}` : ""}`}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              view === "list" ? "bg-forest-700 text-white" : "text-forest-950/70"
            }`}
          >
            <LayoutList size={14} /> List
          </Link>
          <Link
            href={`/jobs?view=calendar${status ? `&status=${status}` : ""}`}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              view === "calendar" ? "bg-forest-700 text-white" : "text-forest-950/70"
            }`}
          >
            <CalendarDays size={14} /> Calendar
          </Link>
        </div>

        <div className="flex gap-1 text-xs">
          {["", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
            <Link
              key={s}
              href={`/jobs?view=${view}${s ? `&status=${s}` : ""}`}
              className={`rounded-full px-3 py-1.5 font-medium ${
                (status ?? "") === s
                  ? "bg-forest-100 text-forest-700"
                  : "text-forest-950/50 hover:bg-surface-muted"
              }`}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      {view === "calendar" ? (
        <CalendarView jobs={jobs} month={month} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs scheduled"
          description="Schedule a job for a customer's property to get started."
          action={
            <Button href="/jobs/new">
              <Plus size={16} /> Schedule Job
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-forest-950/60 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3 hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 hidden md:table-cell">Crew</th>
                <th className="px-4 py-3 hidden md:table-cell">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-border-subtle hover:bg-surface-muted/60">
                  <td className="px-4 py-3 text-forest-950/70">
                    {formatDateShort(j.scheduledDate)}
                    {j.startTime && <span className="block text-xs text-forest-950/40">{j.startTime}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${j.id}`} className="font-medium text-forest-950">
                      {j.title}
                    </Link>
                    <span className="block text-xs text-forest-950/50">{j.property.addressLine}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">{j.customer.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-forest-950/70">{j.crew || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-forest-950/70">
                    {formatCurrency(j.price)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown
                      value={j.status}
                      options={JOB_STATUS_OPTIONS}
                      onChange={setJobStatus.bind(null, j.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

type JobRow = Awaited<ReturnType<typeof prisma.job.findMany<{ include: { customer: true; property: true } }>>>[number];

function CalendarView({ jobs, month }: { jobs: JobRow[]; month?: string }) {
  const anchor = month ? new Date(`${month}-01`) : new Date();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const prevMonth = format(addDays(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addDays(monthEnd, 1), "yyyy-MM");

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/jobs?view=calendar&month=${prevMonth}`} className="text-sm text-forest-700 hover:underline">
          ← Prev
        </Link>
        <p className="font-semibold text-forest-950">{format(monthStart, "MMMM yyyy")}</p>
        <Link href={`/jobs?view=calendar&month=${nextMonth}`} className="text-sm text-forest-700 hover:underline">
          Next →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center font-medium text-forest-950/50 pb-1">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayJobs = jobs.filter((j) => isSameDay(new Date(j.scheduledDate), day));
          const inMonth = isSameMonth(day, monthStart);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] rounded-lg border border-border-subtle p-1 ${
                inMonth ? "bg-surface" : "bg-surface-muted/50"
              }`}
            >
              <p className={`text-right text-[11px] ${inMonth ? "text-forest-950/60" : "text-forest-950/30"}`}>
                {format(day, "d")}
              </p>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((j) => (
                  <Link
                    key={j.id}
                    href={`/jobs/${j.id}`}
                    className="block truncate rounded bg-forest-100 px-1 py-0.5 text-[10px] font-medium text-forest-700 hover:bg-forest-100/70"
                    title={j.title}
                  >
                    {j.title}
                  </Link>
                ))}
                {dayJobs.length > 3 && (
                  <p className="text-[10px] text-forest-950/40">+{dayJobs.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
