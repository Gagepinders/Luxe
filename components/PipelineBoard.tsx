"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Phone, Building2, Plus } from "lucide-react";
import { setPipelineStage } from "@/app/actions/customers";
import { formatDate } from "@/lib/format";

export type PipelineCustomer = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  tags: string | null;
  pipelineStage: string;
  updatedAt: string;
};

const STAGES: { key: string; label: string; accent: string }[] = [
  { key: "new", label: "New", accent: "#9aa39d" },
  { key: "contacted", label: "Contacted", accent: "#3e8fb0" },
  { key: "estimate_scheduled", label: "Estimate Scheduled", accent: "#c9a227" },
  { key: "estimate_sent", label: "Estimate Sent", accent: "#a9821c" },
  { key: "won", label: "Won", accent: "#1c6b3f" },
  { key: "lost", label: "Lost", accent: "#b3261e" },
];

function Card({
  customer,
  onDragStart,
}: {
  customer: PipelineCustomer;
  onDragStart: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(customer.id);
      }}
      className="card card-interactive cursor-grab active:cursor-grabbing active:scale-[0.98] p-3 space-y-1.5"
    >
      <Link href={`/customers/${customer.id}`} className="font-medium text-sm text-forest-950 hover:underline">
        {customer.name}
      </Link>
      {customer.companyName && (
        <p className="flex items-center gap-1 text-xs text-forest-950/50">
          <Building2 size={11} /> {customer.companyName}
        </p>
      )}
      {customer.phone && (
        <a
          href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-forest-950/60 hover:text-forest-700 hover:underline"
        >
          <Phone size={11} /> {customer.phone}
        </a>
      )}
      {customer.email && (
        <p className="flex items-center gap-1 text-xs text-forest-950/60 truncate">
          <Mail size={11} /> {customer.email}
        </p>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="badge bg-surface-muted text-forest-950/60">{customer.type}</span>
        <span className="text-[10px] text-forest-950/40">{formatDate(customer.updatedAt)}</span>
      </div>
    </div>
  );
}

export default function PipelineBoard({ customers }: { customers: PipelineCustomer[] }) {
  const [items, setItems] = useState(customers);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function moveTo(id: string, stage: string) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, pipelineStage: stage } : c)));
    startTransition(async () => {
      await setPipelineStage(id, stage);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageItems = items.filter((c) => c.pipelineStage === stage.key);
        return (
          <div
            key={stage.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.key);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverStage(null);
              if (dragId) moveTo(dragId, stage.key);
            }}
            className={`w-64 shrink-0 rounded-xl border p-2.5 pt-0 overflow-hidden transition-colors ${
              dragOverStage === stage.key
                ? "border-forest-500 bg-forest-50"
                : "border-border-subtle bg-surface-muted/50"
            }`}
          >
            <div className="-mx-2.5 mb-2.5 h-1" style={{ background: stage.accent }} />
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: stage.accent }}
                />
                <p className="text-xs font-semibold text-forest-950/80 uppercase tracking-wide">
                  {stage.label}
                </p>
              </div>
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                style={{ background: stage.accent }}
              >
                {stageItems.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {stageItems.map((c) => (
                <div key={c.id} onDragEnd={() => setDragId(null)}>
                  <Card customer={c} onDragStart={setDragId} />
                </div>
              ))}
              {stageItems.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-forest-950/30">Drop here</p>
              )}
            </div>
            {stage.key === "new" && (
              <Link
                href="/customers/new?stage=new"
                className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-border-subtle py-1.5 text-xs font-medium text-forest-950/60 hover:bg-surface"
              >
                <Plus size={13} /> New lead
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
