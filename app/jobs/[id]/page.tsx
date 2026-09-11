import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { deleteJob, setJobStatus, duplicateJobToNext } from "@/app/actions/jobs";
import { Pencil, Trash2, Play, CheckCircle2, XCircle, Repeat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { customer: true, property: true, serviceType: true, quote: true },
  });
  if (!job) notFound();

  const start = setJobStatus.bind(null, id, "in_progress");
  const complete = setJobStatus.bind(null, id, "completed");
  const cancel = setJobStatus.bind(null, id, "cancelled");
  const reopen = setJobStatus.bind(null, id, "scheduled");
  const remove = deleteJob.bind(null, id);
  const duplicate = duplicateJobToNext.bind(null, id);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={job.title}
        subtitle={`${formatDate(job.scheduledDate)}${job.startTime ? ` · ${job.startTime}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href={`/jobs/${id}/edit`} variant="secondary">
              <Pencil size={14} /> Edit
            </Button>
            <form action={remove}>
              <Button type="submit" variant="danger">
                <Trash2 size={14} /> Delete
              </Button>
            </form>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              {job.recurrence !== "none" && (
                <span className="badge bg-ice-100 text-ice-600">{job.recurrence.replace("_", " ")}</span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
              <div>
                <p className="text-xs text-forest-950/50">Customer</p>
                <Link href={`/customers/${job.customerId}`} className="font-medium text-forest-700 hover:underline">
                  {job.customer.name}
                </Link>
              </div>
              <div>
                <p className="text-xs text-forest-950/50">Property</p>
                <Link href={`/properties/${job.propertyId}`} className="font-medium text-forest-700 hover:underline">
                  {job.property.label}
                </Link>
                <p className="text-xs text-forest-950/50">{job.property.addressLine}</p>
              </div>
              {job.serviceType && (
                <div>
                  <p className="text-xs text-forest-950/50">Service</p>
                  <p>{job.serviceType.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-forest-950/50">Crew</p>
                <p>{job.crew || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs text-forest-950/50">Price</p>
                <p className="font-medium">{formatCurrency(job.price)}</p>
              </div>
              {job.quote && (
                <div>
                  <p className="text-xs text-forest-950/50">From quote</p>
                  <Link href={`/quotes/${job.quote.id}`} className="text-forest-700 hover:underline">
                    #{job.quote.number}
                  </Link>
                </div>
              )}
            </div>
            {job.notes && (
              <p className="pt-2 border-t border-border-subtle text-forest-950/70 whitespace-pre-wrap">
                {job.notes}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-3">
          <section className="card p-5 space-y-2">
            <h2 className="font-semibold text-forest-950 mb-2 text-sm">Actions</h2>
            {job.status === "scheduled" && (
              <form action={start}>
                <Button type="submit" className="w-full">
                  <Play size={14} /> Start job
                </Button>
              </form>
            )}
            {(job.status === "scheduled" || job.status === "in_progress") && (
              <form action={complete}>
                <Button type="submit" variant="secondary" className="w-full">
                  <CheckCircle2 size={14} className="text-success" /> Mark completed
                </Button>
              </form>
            )}
            {job.status !== "cancelled" && job.status !== "completed" && (
              <form action={cancel}>
                <Button type="submit" variant="secondary" className="w-full">
                  <XCircle size={14} className="text-danger" /> Cancel job
                </Button>
              </form>
            )}
            {(job.status === "completed" || job.status === "cancelled") && (
              <form action={reopen}>
                <Button type="submit" variant="secondary" className="w-full">
                  Reopen
                </Button>
              </form>
            )}
            {job.recurrence !== "none" && (
              <form action={duplicate}>
                <Button type="submit" variant="secondary" className="w-full">
                  <Repeat size={14} /> Schedule next occurrence
                </Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
