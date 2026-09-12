"use client";

import { inputClass, Field } from "@/components/ui";

type Customer = { id: string; name: string };
type Property = { id: string; customerId: string; label: string; addressLine: string };

export default function CustomerPropertySelect({
  customers,
  properties,
  customerId,
  propertyId,
  onCustomerChange,
  onPropertyChange,
  lockCustomer = false,
}: {
  customers: Customer[];
  properties: Property[];
  customerId: string;
  propertyId: string;
  onCustomerChange: (id: string) => void;
  onPropertyChange: (id: string) => void;
  lockCustomer?: boolean;
}) {
  const filtered = properties.filter((p) => p.customerId === customerId);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Customer">
        {lockCustomer && <input type="hidden" name="customerId" value={customerId} />}
        <select
          name={lockCustomer ? undefined : "customerId"}
          required={!lockCustomer}
          disabled={lockCustomer}
          value={customerId}
          onChange={(e) => onCustomerChange(e.target.value)}
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
      <Field label="Property (optional)">
        <select
          name="propertyId"
          value={propertyId}
          onChange={(e) => onPropertyChange(e.target.value)}
          className={inputClass}
          disabled={!customerId}
        >
          <option value="">No specific property</option>
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.addressLine}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
