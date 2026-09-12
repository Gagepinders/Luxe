import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button } from "@/components/ui";
import StatusDropdown from "@/components/StatusDropdown";
import { JOB_STATUS_OPTIONS } from "@/lib/statusOptions";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  deleteJob,
  setJobStatus,
  duplicateJobToNext,
  generateRecurringJobs,
  requestReview,
} from "@/app/actions/jobs";
import { uploadJobPhoto, deleteJobPhoto } from "@/app/actions/jobPhotos";
import { addJobExpense, deleteJobExpense } from "@/app/actions/jobExpenses";
import { Pencil, Trash2, Play, CheckCircle2, XCircle, Repeat, Camera, Upload, Receipt, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      customer: true,
      property: true,
      serviceType: true,
      quote: true,
      photos: { orderBy: { createdAt: "desc" } },
      expenses: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!job) notFound();

  const start = setJobStatus.bind(null, id, "in_progress");
  const complete = setJobStatus.bind(null, id, "completed");
  const cancel = setJobStatus.bind(null, id, "cancelled");
  const reopen = setJobStatus.bind(null, id, "scheduled");
  const remove = deleteJob.bind(null, id);
  const duplicate = duplicateJobToNext.bind(null, id);
  const generateBatch = generateRecurringJobs.bind(null, id);
  const sendReviewRequest = requestReview.bind(null, id);
  const upload = uploadJobPhoto.bind(null, id);
  const addExpense = addJobExpense.bind(null, id);

  const totalExpenses = job.expenses.reduce((s, e) => s + e.amount, 0);
  const profit = job.price - totalExpenses;

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
              <StatusDropdown
                value={job.status}
                options={JOB_STATUS_OPTIONS}
                onChange={setJobStatus.bind(null, id)}
              />
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

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 font-semibold text-forest-950">
                <Camera size={16} /> Photos
              </h2>
            </div>
            <form action={upload} className="flex flex-wrap items-center gap-2 mb-4">
              <input
                type="file"
                name="photos"
                accept="image/*"
                multiple
                capture="environment"
                className="flex-1 min-w-[180px] rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-forest-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-forest-700"
              />
              <input
                name="caption"
                placeholder="Caption (optional)"
                className="w-40 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs"
              />
              <Button type="submit" size="sm">
                <Upload size={13} /> Upload
              </Button>
            </form>
            {job.photos.length === 0 ? (
              <p className="text-sm text-forest-950/50">
                No photos yet — add before/after shots or note what needs to be done.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.photos.map((p) => {
                  const removePhoto = deleteJobPhoto.bind(null, p.id, id);
                  return (
                    <div key={p.id} className="group relative">
                      <a href={`/api/uploads/${p.filename}`} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/uploads/${p.filename}`}
                          alt={p.caption ?? "Job photo"}
                          className="h-28 w-full rounded-lg border border-border-subtle object-cover"
                        />
                      </a>
                      {p.caption && (
                        <p className="mt-1 text-xs text-forest-950/60 truncate">{p.caption}</p>
                      )}
                      <form action={removePhoto} className="absolute top-1 right-1">
                        <button
                          type="submit"
                          className="rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-forest-950">Job costing</h2>
              <span
                className={`text-sm font-semibold ${profit >= 0 ? "text-success" : "text-danger"}`}
              >
                {formatCurrency(profit)} profit
              </span>
            </div>
            <form action={addExpense} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <input
                name="description"
                placeholder="Description"
                required
                className="col-span-2 sm:col-span-1 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
              />
              <select
                name="category"
                className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                defaultValue="material"
              >
                <option value="material">Material</option>
                <option value="fuel">Fuel</option>
                <option value="labor">Labor</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
            {job.expenses.length === 0 ? (
              <p className="text-sm text-forest-950/50">
                No expenses logged. Price: {formatCurrency(job.price)}
              </p>
            ) : (
              <>
                <ul className="space-y-1.5 mb-2">
                  {job.expenses.map((e) => {
                    const removeExpense = deleteJobExpense.bind(null, e.id, id);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center justify-between text-sm border-b border-border-subtle pb-1.5"
                      >
                        <span className="text-forest-950/80">
                          {e.description}{" "}
                          <span className="badge bg-surface-muted text-forest-950/50 ml-1">
                            {e.category}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {formatCurrency(e.amount)}
                          <form action={removeExpense}>
                            <button type="submit" className="text-forest-950/30 hover:text-danger">
                              <Trash2 size={12} />
                            </button>
                          </form>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-between text-xs text-forest-950/60">
                  <span>Price: {formatCurrency(job.price)}</span>
                  <span>Expenses: {formatCurrency(totalExpenses)}</span>
                </div>
              </>
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
              <>
                <form action={duplicate}>
                  <Button type="submit" variant="secondary" className="w-full">
                    <Repeat size={14} /> Schedule next occurrence
                  </Button>
                </form>
                <form action={generateBatch} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    name="count"
                    defaultValue={4}
                    min={1}
                    max={52}
                    className="w-14 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    title="Creates that many future visits at once, spaced by this job's recurrence interval"
                  >
                    <Repeat size={14} /> Generate ahead
                  </Button>
                </form>
              </>
            )}
            {job.status === "completed" && (
              <form action={sendReviewRequest}>
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={!job.customer.email}
                  title={!job.customer.email ? "Add an email for this customer first" : undefined}
                >
                  <Star size={14} className="text-gold-500" /> Request a review
                </Button>
              </form>
            )}
            <Button
              href={`/invoices/new?customerId=${job.customerId}&jobId=${id}`}
              variant="secondary"
              className="w-full"
            >
              <Receipt size={14} /> Create invoice
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
