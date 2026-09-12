"use client";

import { useState } from "react";
import { inputClass, Field } from "@/components/ui";

type Customer = { id: string; name: string };
type Job = { id: string; customerId: string; title: string; price: number };

export default function CustomerJobSelect({
  customers,
  jobs,
  defaultCustomerId,
  defaultJobId,
}: {
  customers: Customer[];
  jobs: Job[];
  defaultCustomerId?: string;
  defaultJobId?: string;
}) {
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const filtered = jobs.filter((j) => j.customerId === customerId);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Customer">
        <select
          name="customerId"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
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
      <Field label="Link to job (optional)">
        <select
          name="jobId"
          defaultValue={defaultJobId ?? ""}
          className={inputClass}
          disabled={!customerId}
        >
          <option value="">No specific job</option>
          {filtered.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
