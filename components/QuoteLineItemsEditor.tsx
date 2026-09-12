"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export type LineItemRow = {
  key: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  serviceTypeId: string | null;
};

export type ServiceTypeOption = {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  defaultRate: number;
};

export type PropertyMeasurements = {
  lawnSqft: number | null;
  driveSqft: number | null;
  walkwaySqft: number | null;
  mulchSqft: number | null;
};

function randKey() {
  return Math.random().toString(36).slice(2);
}

const MEASUREMENT_FIELDS: { key: keyof PropertyMeasurements; label: string }[] = [
  { key: "lawnSqft", label: "Lawn" },
  { key: "driveSqft", label: "Driveway" },
  { key: "walkwaySqft", label: "Walkway" },
  { key: "mulchSqft", label: "Mulch beds" },
];

export default function QuoteLineItemsEditor({
  initialItems,
  serviceTypes,
  property,
}: {
  initialItems: LineItemRow[];
  serviceTypes: ServiceTypeOption[];
  property?: PropertyMeasurements | null;
}) {
  const [rows, setRows] = useState<LineItemRow[]>(
    initialItems.length > 0
      ? initialItems
      : [{ key: randKey(), description: "", quantity: 1, unit: "visit", unitPrice: 0, serviceTypeId: null }]
  );
  const payload = useMemo(() => JSON.stringify(rows), [rows]);

  function update(key: string, patch: Partial<LineItemRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: randKey(), description: "", quantity: 1, unit: "visit", unitPrice: 0, serviceTypeId: null },
    ]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function addRowFromMeasurement(label: string, sqft: number) {
    setRows((rs) => [
      ...rs,
      { key: randKey(), description: label, quantity: sqft, unit: "sqft", unitPrice: 0, serviceTypeId: null },
    ]);
  }

  const measurementOptions = property
    ? MEASUREMENT_FIELDS.filter((f) => (property[f.key] ?? 0) > 0)
    : [];

  function applyServiceType(key: string, serviceTypeId: string) {
    const st = serviceTypes.find((s) => s.id === serviceTypeId);
    if (!st) {
      update(key, { serviceTypeId: null });
      return;
    }
    update(key, {
      serviceTypeId: st.id,
      description: st.name,
      unit: st.defaultUnit,
      unitPrice: st.defaultRate,
    });
  }

  const total = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0);

  return (
    <div className="space-y-3">
      <input type="hidden" name="lineItemsPayload" value={payload} readOnly />

      {measurementOptions.length > 0 && (
        <div className="rounded-lg border border-dashed border-border-subtle p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-forest-950/45 mb-1.5">
            Add from measured property
          </p>
          <div className="flex flex-wrap gap-1.5">
            {measurementOptions.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => addRowFromMeasurement(f.label, property![f.key]!)}
                className="rounded-full border border-forest-700/30 bg-forest-700/5 px-3 py-1 text-xs font-medium text-forest-700 hover:bg-forest-700/10"
              >
                + {f.label}: {Math.round(property![f.key]!).toLocaleString()} sq ft
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-forest-950/40">
            Adds a line pre-filled with the measured square footage — then pick a service to apply its rate.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-forest-950/50">
            <tr>
              <th className="pb-2 pr-2">Service</th>
              <th className="pb-2 pr-2">Description</th>
              <th className="pb-2 pr-2 w-20">Qty</th>
              <th className="pb-2 pr-2 w-24">Unit</th>
              <th className="pb-2 pr-2 w-28">Price</th>
              <th className="pb-2 pr-2 w-28 text-right">Total</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border-subtle">
                <td className="py-2 pr-2">
                  <select
                    value={r.serviceTypeId ?? ""}
                    onChange={(e) => applyServiceType(r.key, e.target.value)}
                    className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                  >
                    <option value="">Custom</option>
                    {serviceTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    value={r.description}
                    onChange={(e) => update(r.key, { description: e.target.value })}
                    className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                    placeholder="Description"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    value={r.quantity}
                    onChange={(e) => update(r.key, { quantity: Number(e.target.value) })}
                    className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    value={r.unit}
                    onChange={(e) => update(r.key, { unit: e.target.value })}
                    className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    value={r.unitPrice}
                    onChange={(e) => update(r.key, { unitPrice: Number(e.target.value) })}
                    className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="py-2 pr-2 text-right text-xs font-medium">
                  {formatCurrency(r.quantity * r.unitPrice)}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    className="text-forest-950/40 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
      >
        <Plus size={13} /> Add line
      </button>

      <div className="flex justify-end border-t border-border-subtle pt-3">
        <p className="text-sm font-semibold text-forest-950">
          Total: {formatCurrency(total)}
        </p>
      </div>
    </div>
  );
}
