import { Field, inputClass, Button } from "@/components/ui";
import PropertyMap, { type Measurement } from "@/components/PropertyMapField";

type Customer = { id: string; name: string };
type Property = {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  measurements: string | null;
  gateCode: string | null;
  accessNotes: string | null;
  hazards: string | null;
};

export default function PropertyForm({
  action,
  customers,
  property,
  defaultCustomerId,
}: {
  action: (formData: FormData) => void;
  customers: Customer[];
  property?: Property;
  defaultCustomerId?: string;
}) {
  let initialMeasurements: Measurement[] = [];
  if (property?.measurements) {
    try {
      initialMeasurements = JSON.parse(property.measurements);
    } catch {
      initialMeasurements = [];
    }
  }

  return (
    <form action={action} className="card p-5 space-y-4 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Customer">
          <select
            name="customerId"
            required
            defaultValue={property?.customerId ?? defaultCustomerId ?? ""}
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
        </Field>
        <Field label="Property label">
          <input
            name="label"
            defaultValue={property?.label ?? "Main Property"}
            className={inputClass}
            placeholder="Home, Rental - Maple St…"
          />
        </Field>
      </div>

      <Field label="Street address">
        <input
          name="addressLine"
          required
          defaultValue={property?.addressLine}
          className={inputClass}
          placeholder="123 Maple St"
        />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="City">
          <input
            name="city"
            defaultValue={property?.city ?? "Burlington"}
            className={inputClass}
          />
        </Field>
        <Field label="State">
          <input name="state" defaultValue={property?.state ?? "VT"} className={inputClass} />
        </Field>
        <Field label="Zip">
          <input name="zip" defaultValue={property?.zip ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="Measure the property" hint="Set the pin, then trace lawn / driveway / walkway areas.">
        <PropertyMap
          initialLat={property?.lat ?? 0}
          initialLng={property?.lng ?? 0}
          initialMeasurements={initialMeasurements}
          hiddenInputName="mapPayload"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Gate code / access" hint="Shared with crew on job sheets">
          <input
            name="gateCode"
            defaultValue={property?.gateCode ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Hazards" hint="Dogs, sprinkler heads, low branches, septic lids…">
          <input
            name="hazards"
            defaultValue={property?.hazards ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Access notes">
        <textarea
          name="accessNotes"
          defaultValue={property?.accessNotes ?? ""}
          rows={2}
          className={inputClass}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit">{property ? "Save changes" : "Create property"}</Button>
        <Button
          href={property ? `/properties/${property.id}` : "/properties"}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
