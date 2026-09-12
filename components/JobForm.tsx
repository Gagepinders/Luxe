"use client";

import { useState } from "react";
import { Field, inputClass, Button } from "@/components/ui";
import CustomerPropertySelect from "@/components/CustomerPropertySelect";

type Customer = { id: string; name: string };
type Property = { id: string; customerId: string; label: string; addressLine: string };
type ServiceType = { id: string; name: string; category: string };

export default function JobForm({
  action,
  customers,
  properties,
  serviceTypes,
  defaultCustomerId,
  defaultPropertyId,
  job,
}: {
  action: (formData: FormData) => void;
  customers: Customer[];
  properties: Property[];
  serviceTypes: ServiceType[];
  defaultCustomerId?: string;
  defaultPropertyId?: string;
  job?: {
    id: string;
    customerId: string;
    propertyId: string;
    serviceTypeId: string | null;
    title: string;
    scheduledDate: Date;
    startTime: string | null;
    endTime: string | null;
    crew: string | null;
    price: number;
    recurrence: string;
    notes: string | null;
  };
}) {
  const dateStr = new Date(job?.scheduledDate ?? new Date()).toISOString().slice(0, 10);
  const [customerId, setCustomerId] = useState(job?.customerId ?? defaultCustomerId ?? "");
  const [propertyId, setPropertyId] = useState(job?.propertyId ?? defaultPropertyId ?? "");

  return (
    <form action={action} className="card p-5 space-y-4 max-w-3xl">
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
        lockCustomer={Boolean(job)}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Job title">
          <input
            name="title"
            defaultValue={job?.title ?? ""}
            className={inputClass}
            placeholder="e.g. Weekly mowing"
          />
        </Field>
        <Field label="Service type">
          <select
            name="serviceTypeId"
            defaultValue={job?.serviceTypeId ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Date">
          <input type="date" name="scheduledDate" defaultValue={dateStr} required className={inputClass} />
        </Field>
        <Field label="Start time">
          <input type="time" name="startTime" defaultValue={job?.startTime ?? ""} className={inputClass} />
        </Field>
        <Field label="End time">
          <input type="time" name="endTime" defaultValue={job?.endTime ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Crew / assigned to">
          <input name="crew" defaultValue={job?.crew ?? ""} className={inputClass} placeholder="Crew A" />
        </Field>
        <Field label="Price">
          <input type="number" step="0.01" name="price" defaultValue={job?.price ?? 0} className={inputClass} />
        </Field>
        <Field label="Recurrence">
          <select name="recurrence" defaultValue={job?.recurrence ?? "none"} className={inputClass}>
            <option value="none">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="on_demand">On-demand (snow)</option>
          </select>
        </Field>
      </div>

      <Field label="Job notes">
        <textarea name="notes" defaultValue={job?.notes ?? ""} rows={3} className={inputClass} />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit">{job ? "Save changes" : "Schedule job"}</Button>
        <Button href={job ? `/jobs/${job.id}` : "/jobs"} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
