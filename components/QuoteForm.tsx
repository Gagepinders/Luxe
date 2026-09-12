"use client";

import { useState } from "react";
import { Field, inputClass, Button } from "@/components/ui";
import CustomerPropertySelect from "@/components/CustomerPropertySelect";
import QuoteLineItemsEditor, {
  type LineItemRow,
  type ServiceTypeOption,
} from "@/components/QuoteLineItemsEditor";

type Customer = { id: string; name: string };
type Property = {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  lawnSqft: number | null;
  driveSqft: number | null;
  walkwaySqft: number | null;
  mulchSqft: number | null;
};

export default function QuoteForm({
  action,
  customers,
  properties,
  serviceTypes,
  defaultCustomerId,
  defaultPropertyId,
  quote,
}: {
  action: (formData: FormData) => void;
  customers: Customer[];
  properties: Property[];
  serviceTypes: ServiceTypeOption[];
  defaultCustomerId?: string;
  defaultPropertyId?: string;
  quote?: {
    id: string;
    title: string;
    notes: string | null;
    validUntil: Date | null;
    customerId: string;
    propertyId: string | null;
    lineItems: {
      id: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      serviceTypeId: string | null;
    }[];
  };
}) {
  const initialItems: LineItemRow[] = (quote?.lineItems ?? []).map((li) => ({
    key: li.id,
    description: li.description,
    quantity: li.quantity,
    unit: li.unit,
    unitPrice: li.unitPrice,
    serviceTypeId: li.serviceTypeId,
  }));

  const [customerId, setCustomerId] = useState(quote?.customerId ?? defaultCustomerId ?? "");
  const [propertyId, setPropertyId] = useState(quote?.propertyId ?? defaultPropertyId ?? "");
  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null;

  const validUntilStr = quote?.validUntil
    ? new Date(quote.validUntil).toISOString().slice(0, 10)
    : "";

  return (
    <form action={action} className="card p-5 space-y-4 max-w-4xl">
      <CustomerPropertySelect
        customers={customers}
        properties={properties}
        customerId={customerId}
        propertyId={propertyId}
        onCustomerChange={(id) => {
          setCustomerId(id);
          setPropertyId("");
        }}
        onPropertyChange={setPropertyId}
        lockCustomer={Boolean(quote)}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Quote title">
          <input
            name="title"
            defaultValue={quote?.title ?? ""}
            className={inputClass}
            placeholder="e.g. Weekly mowing + fall cleanup"
          />
        </Field>
        <Field label="Valid until">
          <input
            type="date"
            name="validUntil"
            defaultValue={validUntilStr}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Line items">
        <QuoteLineItemsEditor
          initialItems={initialItems}
          serviceTypes={serviceTypes}
          property={selectedProperty}
        />
      </Field>

      <Field label="Notes">
        <textarea name="notes" defaultValue={quote?.notes ?? ""} rows={3} className={inputClass} />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit">{quote ? "Save changes" : "Create quote"}</Button>
        <Button href={quote ? `/quotes/${quote.id}` : "/quotes"} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
