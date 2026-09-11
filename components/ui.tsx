import Link from "next/link";
import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-950">{title}</h1>
        {subtitle && <p className="text-sm text-forest-950/60 mt-1">{subtitle}</p>}
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
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors whitespace-nowrap";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-forest-700 text-white hover:bg-forest-800",
    secondary:
      "bg-surface border border-border-subtle text-forest-950 hover:bg-surface-muted",
    ghost: "text-forest-950/70 hover:bg-surface-muted",
    danger: "bg-danger text-white hover:bg-danger/90",
  };
  const cls = `${base} ${sizes} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

const STATUS_STYLES: Record<string, string> = {
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
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-surface-muted text-forest-950/70";
  return (
    <span className={`badge ${style}`}>{status.replace("_", " ")}</span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center text-center px-6 py-14 gap-2">
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

export const inputClass =
  "w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-500";
