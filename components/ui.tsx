import Link from "next/link";
import { ReactNode, type ComponentType } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="animate-in flex flex-wrap items-start justify-between gap-3 mb-7">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <span className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-forest-600 to-forest-800 text-white shadow-[0_4px_14px_-4px_rgba(13,31,20,0.45)]">
            <Icon size={20} />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-forest-950">{title}</h1>
          {subtitle && <p className="text-sm text-forest-950/60 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  onClick,
  className = "",
  size = "md",
  disabled = false,
  title,
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap active:scale-[0.97]";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-b from-forest-600 to-forest-700 text-white shadow-sm shadow-forest-900/20 hover:from-forest-700 hover:to-forest-800 hover:shadow-md hover:shadow-forest-900/25",
    secondary:
      "bg-surface border border-border-subtle text-forest-950 hover:bg-surface-muted hover:border-forest-500/30",
    ghost: "text-forest-950/70 hover:bg-surface-muted",
    danger:
      "bg-gradient-to-b from-danger to-danger/90 text-white shadow-sm shadow-danger/20 hover:shadow-md hover:shadow-danger/25",
  };
  const disabledCls = disabled ? "opacity-50 pointer-events-none active:scale-100" : "";
  const cls = `${base} ${sizes} ${variants[variant]} ${disabledCls} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  );
}

export const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-muted text-forest-950/70",
  sent: "bg-ice-100 text-ice-600",
  won: "bg-success-100 text-success",
  lost: "bg-danger-100 text-danger",
  scheduled: "bg-ice-100 text-ice-600",
  in_progress: "bg-warning-100 text-warning",
  completed: "bg-success-100 text-success",
  cancelled: "bg-surface-muted text-forest-950/50",
  active: "bg-success-100 text-success",
  inactive: "bg-surface-muted text-forest-950/50",
  lead: "bg-gold-100 text-gold-600",
  new: "bg-surface-muted text-forest-950/70",
  contacted: "bg-ice-100 text-ice-600",
  estimate_scheduled: "bg-gold-100 text-gold-600",
  estimate_sent: "bg-gold-100 text-gold-600",
  paid: "bg-success-100 text-success",
  overdue: "bg-danger-100 text-danger",
  sending: "bg-warning-100 text-warning",
  failed: "bg-danger-100 text-danger",
  connected: "bg-success-100 text-success",
  voicemail: "bg-gold-100 text-gold-600",
  no_answer: "bg-surface-muted text-forest-950/60",
  busy: "bg-surface-muted text-forest-950/60",
  wrong_number: "bg-danger-100 text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-surface-muted text-forest-950/70";
  return (
    <span className={`badge ${style}`}>
      <span className="badge-dot" />
      {status.replace("_", " ")}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="animate-in card flex flex-col items-center justify-center text-center px-6 py-16 gap-2.5">
      {Icon && (
        <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-50 to-forest-100 text-forest-600">
          <Icon size={24} />
        </span>
      )}
      <p className="font-medium text-forest-950">{title}</p>
      {description && (
        <p className="text-sm text-forest-950/60 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-forest-950/80">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-forest-950/50">{hint}</span>}
    </label>
  );
}

// Same layout as Field, but without the wrapping <label>. Use this when children
// contain their own interactive controls (buttons, a map toolbar, etc.) — wrapping
// multiple labelable elements in one <label> makes the browser forward every click
// inside it to the first one, which silently "clicks" buttons the user never touched.
export function FieldGroup({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="block text-sm">
      <span className="font-medium text-forest-950/80">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-forest-950/50">{hint}</span>}
    </div>
  );
}

// A small icon chip + title, used for card section headers throughout detail
// pages — same visual language as PageHeader's icon, at a smaller scale.
export function SectionHeader({
  title,
  icon: Icon,
  tone = "forest",
  action,
}: {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: "forest" | "gold" | "ice";
  action?: ReactNode;
}) {
  const toneCls: Record<string, string> = {
    forest: "bg-forest-100 text-forest-700",
    gold: "bg-gold-100 text-gold-600",
    ice: "bg-ice-100 text-ice-600",
  };
  return (
    <div className="flex items-center justify-between mb-3.5">
      <h2 className="flex items-center gap-2.5 font-semibold text-forest-950">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneCls[tone]}`}>
          <Icon size={14} />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-forest-950 shadow-sm shadow-black/[0.02] focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500/40";
