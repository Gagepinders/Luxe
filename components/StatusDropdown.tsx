"use client";

import { useState, useTransition } from "react";
import { STATUS_STYLES } from "@/components/ui";

const CHEVRON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23235233' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>";

export default function StatusDropdown({
  value,
  options,
  onChange,
  disabled,
  colorKey,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => Promise<unknown>;
  disabled?: boolean;
  // Use a different key than `value` to color the closed pill — e.g. an
  // invoice whose real status is "sent" but is past due should still read
  // as "overdue" red even though "overdue" isn't a selectable option.
  colorKey?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(value);
  const shown = pending ? optimistic : value;
  const style = STATUS_STYLES[pending ? shown : colorKey ?? shown] ?? "bg-surface-muted text-forest-950/70";

  return (
    <select
      value={shown}
      disabled={disabled || pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value;
        setOptimistic(next);
        startTransition(async () => {
          await onChange(next);
        });
      }}
      className={`badge cursor-pointer appearance-none border-0 pr-5 normal-case font-medium ${style} ${
        pending ? "opacity-60" : ""
      }`}
      style={{
        backgroundImage: `url("${CHEVRON}")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 4px center",
        backgroundSize: "10px",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
