import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import { addCustomerNote, deleteCustomer } from "@/app/actions/customers";
import { logCall, clearFollowUp } from "@/app/actions/calls";
import { CALL_OUTCOME_LABELS } from "@/lib/callLogs";
import CopyButton from "@/components/CopyButton";
import { Plus, Mail, Phone, Building2, Pencil, Trash2, MapPin, PhoneCall } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      properties: true,
      quotes: { include: { lineItems: true }, orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { scheduledDate: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      callLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  const pendingFollowUp = customer.callLogs[0]?.followUpAt ?? null;
  const pendingFollowUpCallId = customer.callLogs[0]?.id;
  const telHref = customer.phone ? `tel:${customer.phone.replace(/[^\d+]/g, "")}` : null;
  const logCallAction = logCall.bind(null, id);
  const clearFollowUpAction = pendingFollowUpCallId
    ? clearFollowUp.bind(null, pendingFollowUpCallId, id)
    : undefined;

  const quoteTotal = (q: (typeof customer.quotes)[number]) =>
    q.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

  const wonRevenue = customer.quotes
    .filter((q) => q.status === "won")
    .reduce((sum, q) => sum + quoteTotal(q), 0);

  const addNoteAction = addCustomerNote.bind(null, id);
  const deleteAction = deleteCustomer.bind(null, id);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={customer.companyName ?? undefined}
        action={
          <div className="flex gap-2">
            <Button href={`/customers/${id}/edit`} variant="secondary">
              <Pencil size={14} /> Edit
            </Button>
            <form action={deleteAction}>
              <Button type="submit" variant="danger">
                <Trash2 size={14} /> Delete
              </Button>
            </form>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-forest-950">Properties</h2>
              <Button href={`/properties/new?customerId=${id}`} size="sm" variant="secondary">
                <Plus size={14} /> Add property
              </Button>
            </div>
            {customer.properties.length === 0 ? (
              <p className="text-sm text-forest-950/50">No properties yet.</p>
            ) : (
              <ul className="space-y-2">
                {customer.properties.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/properties/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 hover:bg-surface-muted/60"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-forest-950">
                        <MapPin size={14} className="text-forest-600" />
                        {p.label} — {p.addressLine}
                      </span>
                      <span className="text-xs text-forest-950/50">
                        {p.lawnSqft ? `${Math.round(p.lawnSqft).toLocaleString()} sq ft lawn` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-forest-950">Quotes</h2>
              <Button href={`/quotes/new?customerId=${id}`} size="sm" variant="secondary">
                <Plus size={14} /> New quote
              </Button>
            </div>
            {customer.quotes.length === 0 ? (
              <p className="text-sm text-forest-950/50">No quotes yet.</p>
            ) : (
              <ul className="space-y-2">
                {customer.quotes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/quotes/${q.id}`}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 hover:bg-surface-muted/60"
                    >
                      <span className="text-sm font-medium text-forest-950">
                        #{q.number} {q.title || "Untitled quote"}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-forest-950/60">
                        {formatCurrency(quoteTotal(q))}
                        <StatusBadge status={q.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-forest-950">Jobs</h2>
              <Button href={`/jobs/new?customerId=${id}`} size="sm" variant="secondary">
                <Plus size={14} /> New job
              </Button>
            </div>
            {customer.jobs.length === 0 ? (
              <p className="text-sm text-forest-950/50">No jobs scheduled yet.</p>
            ) : (
              <ul className="space-y-2">
                {customer.jobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 hover:bg-surface-muted/60"
                    >
                      <span className="text-sm font-medium text-forest-950">{j.title}</span>
                      <span className="flex items-center gap-3 text-xs text-forest-950/60">
                        {formatDateShort(j.scheduledDate)}
                        <StatusBadge status={j.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <StatusBadge status={customer.status} />
                <StatusBadge status={customer.pipelineStage} />
              </div>
              <span className="badge bg-surface-muted text-forest-950/70">
                {customer.type}
              </span>
            </div>
            {customer.source && (
              <p className="text-xs text-forest-950/50">
                Source: <span className="text-forest-950/70">{customer.source}</span>
              </p>
            )}
            {customer.phone && (
              <a
                href={telHref!}
                className="flex items-center gap-2 text-forest-950/80 hover:text-forest-700 hover:underline"
              >
                <Phone size={14} /> {customer.phone}
              </a>
            )}
            {customer.email && (
              <p className="flex items-center gap-2 text-forest-950/80">
                <Mail size={14} /> {customer.email}
              </p>
            )}
            {customer.companyName && (
              <p className="flex items-center gap-2 text-forest-950/80">
                <Building2 size={14} /> {customer.companyName}
              </p>
            )}
            <div className="pt-2 border-t border-border-subtle">
              <p className="text-xs text-forest-950/50 uppercase tracking-wide">
                Lifetime won revenue
              </p>
              <p className="text-lg font-semibold text-forest-950">
                {formatCurrency(wonRevenue)}
              </p>
            </div>
            {customer.tags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customer.tags.split(",").map((t) => (
                  <span key={t} className="badge bg-forest-100 text-forest-700">
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}
            {customer.notes && (
              <p className="pt-2 border-t border-border-subtle text-forest-950/70 whitespace-pre-wrap">
                {customer.notes}
              </p>
            )}
          </section>

          <section className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-forest-950 text-sm">Call</h2>
              {telHref ? (
                <div className="flex items-center gap-1.5">
                  <a
                    href={telHref}
                    className="flex items-center gap-1.5 rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-800"
                  >
                    <PhoneCall size={13} /> Call {customer.phone}
                  </a>
                  <CopyButton value={customer.phone!} label="Copy phone number" />
                </div>
              ) : (
                <span className="text-xs text-forest-950/40">No phone on file</span>
              )}
            </div>

            {pendingFollowUp && (
              <div className="flex items-center justify-between rounded-lg bg-gold-100 px-3 py-2 text-xs text-gold-700">
                <span>Follow up {formatDate(pendingFollowUp)}</span>
                {clearFollowUpAction && (
                  <form action={clearFollowUpAction}>
                    <button type="submit" className="underline hover:no-underline">
                      Clear
                    </button>
                  </form>
                )}
              </div>
            )}

            <form action={logCallAction} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="direction"
                  defaultValue="outbound"
                  className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
                <select
                  name="outcome"
                  defaultValue="connected"
                  className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                >
                  {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="notes"
                placeholder="What was discussed…"
                rows={2}
                className="w-full rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs resize-none"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="followUpAt"
                  className="flex-1 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                />
                <Button type="submit" size="sm">
                  Log call
                </Button>
              </div>
            </form>

            {customer.callLogs.length > 0 && (
              <ul className="space-y-2 pt-2 border-t border-border-subtle">
                {customer.callLogs.slice(0, 5).map((c) => (
                  <li key={c.id} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.outcome} />
                      <span className="text-forest-950/40">
                        {c.direction === "inbound" ? "inbound" : "outbound"} ·{" "}
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    {c.notes && <p className="text-forest-950/70 mt-0.5">{c.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-forest-950 mb-3">Activity</h2>
            <form action={addNoteAction} className="flex gap-2 mb-4">
              <input
                name="note"
                placeholder="Log a call, note, or update…"
                className="flex-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
            {customer.activities.length === 0 ? (
              <p className="text-sm text-forest-950/50">No activity logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {customer.activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="text-forest-950/80">{a.body}</p>
                    <p className="text-xs text-forest-950/40">
                      {formatDate(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
