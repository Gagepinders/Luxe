"use client";

import { useRef, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import PropertyMap, { type Measurement } from "@/components/PropertyMapField";
import { saveMapProperty } from "@/app/actions/properties";
import { inputClass } from "@/components/ui";

type Customer = { id: string; name: string };

type CreateSeed = { addressLine: string; lat: number; lng: number };

type EditProperty = {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  measurements: string | null;
  gateCode: string | null;
  accessNotes: string | null;
  hazards: string | null;
};

export default function MapMeasurePanel({
  mode,
  seed,
  property,
  customers,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  seed?: CreateSeed;
  property?: EditProperty;
  customers: Customer[];
  onClose: () => void;
  onSaved: (result: { propertyId: string; customerId: string; customerName: string }) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [addingCustomer, setAddingCustomer] = useState(customers.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  let initialMeasurements: Measurement[] = [];
  if (property?.measurements) {
    try {
      initialMeasurements = JSON.parse(property.measurements);
    } catch {
      initialMeasurements = [];
    }
  }

  const lat = property?.lat ?? seed?.lat ?? 0;
  const lng = property?.lng ?? seed?.lng ?? 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await saveMapProperty(formData);
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full sm:w-[440px] overflow-y-auto bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3">
          <h2 className="font-semibold text-forest-950">
            {mode === "create" ? "Measure & save property" : "Edit measurements"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-forest-950/50 hover:bg-surface-muted"
          >
            <X size={16} />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-4 space-y-4">
          {property && <input type="hidden" name="propertyId" value={property.id} />}

          <div>
            <label className="block text-sm font-medium text-forest-950/80 mb-1">Customer</label>
            {addingCustomer ? (
              <div className="space-y-1.5">
                <input
                  name="newCustomerName"
                  required
                  autoFocus
                  placeholder="New customer's name"
                  defaultValue=""
                  className={inputClass}
                />
                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddingCustomer(false)}
                    className="text-xs text-forest-700 hover:underline"
                  >
                    Use an existing customer instead
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <select
                  name="customerId"
                  required
                  defaultValue={property?.customerId ?? ""}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a customer
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingCustomer(true)}
                  className="text-xs text-forest-700 hover:underline"
                >
                  + New customer
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-forest-950/80 mb-1">Label</label>
              <input
                name="label"
                defaultValue={property?.label ?? "Main Property"}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest-950/80 mb-1">Zip</label>
              <input name="zip" defaultValue={property?.zip ?? ""} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-950/80 mb-1">
              Street address
            </label>
            <input
              name="addressLine"
              required
              defaultValue={property?.addressLine ?? seed?.addressLine ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-forest-950/80 mb-1">City</label>
              <input
                name="city"
                defaultValue={property?.city ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest-950/80 mb-1">State</label>
              <input name="state" defaultValue={property?.state ?? "VT"} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-950/80 mb-1">
              Measure the property
            </label>
            <PropertyMap
              initialLat={lat}
              initialLng={lng}
              initialMeasurements={initialMeasurements}
              hiddenInputName="mapPayload"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-forest-950/80 mb-1">
                Gate code
              </label>
              <input name="gateCode" defaultValue={property?.gateCode ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest-950/80 mb-1">Hazards</label>
              <input name="hazards" defaultValue={property?.hazards ?? ""} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-forest-950/80 mb-1">
              Access notes
            </label>
            <textarea
              name="accessNotes"
              defaultValue={property?.accessNotes ?? ""}
              rows={2}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : mode === "create" ? "Save property" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium hover:bg-surface-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
