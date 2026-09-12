"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// A guaranteed fallback for calling: tel: links depend on the device/browser
// having a call handler registered (finicky in practice — Google Voice's
// extension especially), so this lets you copy the number and paste it
// into whatever's actually open instead.
export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable (e.g. insecure context) — silently no-op.
        }
      }}
      title={label ?? `Copy ${value}`}
      className="flex items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs text-forest-950/60 hover:bg-surface-muted"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
