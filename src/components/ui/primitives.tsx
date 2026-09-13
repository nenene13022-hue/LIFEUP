import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx(
        "bg-surface border border-border rounded-xl3 p-4 shadow-card",
        onClick && "tap-scale cursor-pointer active:opacity-90",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
  size = "lg",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  size?: "lg" | "md" | "sm";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "tap-scale font-semibold rounded-2xl flex items-center justify-center gap-2 transition-opacity",
        size === "lg" && "h-14 px-6 text-base",
        size === "md" && "h-11 px-4 text-sm",
        size === "sm" && "h-9 px-3 text-sm",
        variant === "primary" && "bg-gradient-brand text-black shadow-glow",
        variant === "secondary" && "bg-surface-2 text-text-primary border border-border",
        variant === "ghost" && "text-text-secondary",
        variant === "danger" && "bg-negative/15 text-negative border border-negative/30",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ pct, colorClass = "bg-gradient-brand" }: { pct: number; colorClass?: string }) {
  return (
    <div className="w-full h-2.5 rounded-full bg-surface-3 overflow-hidden">
      <div
        className={clsx("h-full rounded-full transition-all duration-700 ease-out", colorClass)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  selected,
  onClick,
  className,
  style,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={clsx(
        "tap-scale rounded-2xl px-4 py-3 text-sm font-medium border transition-colors text-start",
        selected
          ? "bg-gradient-brand text-black border-transparent"
          : "bg-surface-2 text-text-primary border-border",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "positive" | "warning" | "negative" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "default" && "bg-surface-3 text-text-secondary",
        tone === "positive" && "bg-positive/15 text-positive",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "negative" && "bg-negative/15 text-negative"
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  emoji,
  title,
  subtitle,
  action,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 gap-2 animate-fade-in">
      <div className="text-5xl mb-2 animate-float">{emoji}</div>
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-text-secondary text-sm max-w-[26ch]">{subtitle}</div>
      {action && <div className="mt-4 w-full">{action}</div>}
    </div>
  );
}

export function ScreenHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="mb-4 animate-fade-in flex items-center gap-3">
      {icon}
      <div>
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-text-secondary text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-text-secondary mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full h-[3.25rem] rounded-2xl bg-surface-2 border border-border px-4 py-3 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-brand-from transition-colors";
