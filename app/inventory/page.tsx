import { prisma } from "@/lib/prisma";
import { PageHeader, Field, inputClass, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  createMaterial,
  addStock,
  useStock,
  deleteMaterial,
  createEquipment,
  markServiced,
  setEquipmentStatus,
  deleteEquipment,
} from "@/app/actions/inventory";
import { AlertTriangle, Plus, Trash2, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

const EQUIPMENT_STATUS_STYLE: Record<string, string> = {
  active: "bg-forest-700/10 text-forest-700",
  maintenance: "bg-gold-100 text-gold-600",
  retired: "bg-surface-muted text-forest-950/50",
};

export default async function InventoryPage() {
  const [materials, equipment] = await Promise.all([
    prisma.materialStock.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { name: "asc" } }),
  ]);

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Materials & Equipment"
        subtitle="Keep an eye on mulch, salt, and fleet maintenance before they become a problem."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Materials */}
        <section className="space-y-4">
          <h2 className="font-semibold text-forest-950">Materials</h2>

          {materials.length === 0 ? (
            <EmptyState title="No materials tracked yet" description="Add mulch, salt, ice melt, or anything else you keep stock of." />
          ) : (
            <div className="space-y-3">
              {materials.map((m) => {
                const low = m.quantity <= m.lowStockAt;
                return (
                  <div key={m.id} className={`card p-4 ${low ? "border-danger/40" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-forest-950 flex items-center gap-1.5">
                          {m.name}
                          {low && (
                            <span className="badge bg-danger-100 text-danger normal-case">
                              <AlertTriangle size={11} /> Low stock
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-forest-950/60">
                          {m.quantity.toLocaleString()} {m.unit}
                          {m.lowStockAt > 0 && (
                            <span className="text-forest-950/40">
                              {" "}
                              · alert at {m.lowStockAt.toLocaleString()} {m.unit}
                            </span>
                          )}
                        </p>
                        {m.notes && <p className="text-xs text-forest-950/45 mt-0.5">{m.notes}</p>}
                      </div>
                      <form action={deleteMaterial.bind(null, m.id)}>
                        <button
                          type="submit"
                          className="rounded-lg p-1.5 text-forest-950/40 hover:bg-danger-100 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <form action={addStock} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={m.id} />
                        <input
                          type="number"
                          step="0.1"
                          name="amount"
                          defaultValue={1}
                          className="w-16 rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-border-subtle px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                        >
                          + Add
                        </button>
                      </form>
                      <form action={useStock} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={m.id} />
                        <input
                          type="number"
                          step="0.1"
                          name="amount"
                          defaultValue={1}
                          className="w-16 rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-border-subtle px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                        >
                          − Use
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card p-4">
            <p className="text-sm font-semibold text-forest-950 mb-2 flex items-center gap-1.5">
              <Plus size={14} /> Add material
            </p>
            <form action={createMaterial} className="grid sm:grid-cols-2 gap-3">
              <Field label="Name">
                <input name="name" required className={inputClass} placeholder="Mulch" />
              </Field>
              <Field label="Unit">
                <input name="unit" className={inputClass} placeholder="yards, bags, tons…" />
              </Field>
              <Field label="Current quantity">
                <input type="number" step="0.1" name="quantity" defaultValue={0} className={inputClass} />
              </Field>
              <Field label="Low stock alert at">
                <input type="number" step="0.1" name="lowStockAt" defaultValue={0} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <input name="notes" className={inputClass} placeholder="Supplier, reorder info…" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
                >
                  Add material
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Equipment */}
        <section className="space-y-4">
          <h2 className="font-semibold text-forest-950">Equipment</h2>

          {equipment.length === 0 ? (
            <EmptyState title="No equipment tracked yet" description="Add mowers, plows, and trucks to track maintenance." />
          ) : (
            <div className="space-y-3">
              {equipment.map((e) => {
                const overdue = e.nextServiceDue ? e.nextServiceDue < now : false;
                const dueSoon = e.nextServiceDue ? e.nextServiceDue <= soon && !overdue : false;
                return (
                  <div key={e.id} className={`card p-4 ${overdue ? "border-danger/40" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-forest-950 flex items-center gap-1.5">
                          {e.name}
                          <span
                            className={`badge normal-case ${EQUIPMENT_STATUS_STYLE[e.status] ?? ""}`}
                          >
                            {e.status}
                          </span>
                        </p>
                        <p className="text-sm text-forest-950/60 capitalize">{e.category}</p>
                        {e.nextServiceDue && (
                          <p
                            className={`text-xs mt-0.5 flex items-center gap-1 ${
                              overdue ? "text-danger font-medium" : dueSoon ? "text-gold-600 font-medium" : "text-forest-950/45"
                            }`}
                          >
                            {(overdue || dueSoon) && <AlertTriangle size={11} />}
                            Next service due {formatDate(e.nextServiceDue)}
                            {overdue ? " — overdue" : dueSoon ? " — due soon" : ""}
                          </p>
                        )}
                        {e.lastServicedAt && (
                          <p className="text-xs text-forest-950/40">
                            Last serviced {formatDate(e.lastServicedAt)}
                          </p>
                        )}
                        {e.notes && <p className="text-xs text-forest-950/45 mt-0.5">{e.notes}</p>}
                      </div>
                      <form action={deleteEquipment.bind(null, e.id)}>
                        <button
                          type="submit"
                          className="rounded-lg p-1.5 text-forest-950/40 hover:bg-danger-100 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <form action={markServiced.bind(null, e.id, 90)}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                        >
                          <Wrench size={12} /> Mark serviced (+90d)
                        </button>
                      </form>
                      {e.status !== "maintenance" && (
                        <form action={setEquipmentStatus.bind(null, e.id, "maintenance")}>
                          <button
                            type="submit"
                            className="rounded-md border border-border-subtle px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                          >
                            Send to maintenance
                          </button>
                        </form>
                      )}
                      {e.status !== "retired" && (
                        <form action={setEquipmentStatus.bind(null, e.id, "retired")}>
                          <button
                            type="submit"
                            className="rounded-md border border-border-subtle px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                          >
                            Retire
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card p-4">
            <p className="text-sm font-semibold text-forest-950 mb-2 flex items-center gap-1.5">
              <Plus size={14} /> Add equipment
            </p>
            <form action={createEquipment} className="grid sm:grid-cols-2 gap-3">
              <Field label="Name">
                <input name="name" required className={inputClass} placeholder="Toro Z Master" />
              </Field>
              <Field label="Category">
                <select name="category" className={inputClass} defaultValue="equipment">
                  <option value="vehicle">Vehicle</option>
                  <option value="mower">Mower</option>
                  <option value="plow">Plow</option>
                  <option value="trimmer">Trimmer</option>
                  <option value="equipment">Other equipment</option>
                </select>
              </Field>
              <Field label="Next service due">
                <input type="date" name="nextServiceDue" className={inputClass} />
              </Field>
              <Field label="Notes">
                <input name="notes" className={inputClass} placeholder="VIN, notes…" />
              </Field>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
                >
                  Add equipment
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
