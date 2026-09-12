"use client";

import { useEffect, useState, useTransition } from "react";
import { Field, inputClass, Button } from "@/components/ui";
import { countAudience } from "@/app/actions/campaigns";
import { Users } from "lucide-react";

const AUDIENCES = [
  { value: "all", label: "All customers with an email" },
  { value: "status:active", label: "Active customers" },
  { value: "status:lead", label: "Leads" },
  { value: "pipeline:won", label: "Won (customers)" },
  { value: "pipeline:estimate_sent", label: "Estimate sent, no decision yet" },
  { value: "pipeline:lost", label: "Lost / not sold" },
];

export default function CampaignForm({
  action,
  campaign,
}: {
  action: (formData: FormData) => void;
  campaign?: { id: string; subject: string; body: string; audience: string };
}) {
  const [audience, setAudience] = useState(campaign?.audience ?? "all");
  const [count, setCount] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const c = await countAudience(audience);
      setCount(c);
    });
  }, [audience]);

  return (
    <form action={action} className="card p-5 space-y-4 max-w-3xl">
      <Field label="Subject">
        <input
          name="subject"
          required
          defaultValue={campaign?.subject}
          className={inputClass}
          placeholder="Spring cleanup specials are here!"
        />
      </Field>

      <Field label="Send to">
        <select
          name="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className={inputClass}
        >
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-forest-950/50">
          <Users size={12} /> {count === null ? "…" : count} recipient{count === 1 ? "" : "s"}
        </p>
      </Field>

      <Field
        label="Message"
        hint='Use {{name}} to personalize with the customer&rsquo;s first name. Basic HTML (like <b> or <br>) is supported.'
      >
        <textarea
          name="body"
          required
          defaultValue={campaign?.body}
          rows={10}
          className={inputClass}
          placeholder={"Hi {{name}},\n\nSpring is here and we're booking cleanups now..."}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <Button type="submit">{campaign ? "Save changes" : "Save draft"}</Button>
        <Button href={campaign ? `/campaigns/${campaign.id}` : "/campaigns"} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
