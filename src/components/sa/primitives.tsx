/**
 * SURVIVAL ACADEMY — sa/ primitives (Phase 23).
 * Faithful port of the Lovable reference `src/components/sa/primitives.tsx`,
 * adapted to react-router and the production design-token system. Visual
 * recipes are kept verbatim; the only changes are the Link import and the
 * `cn` helper location.
 */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { catColorForCode } from "@/lib/category-visuals";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** VISUAL — returns the CSS accent colour for a backend category code. */
export const catColor = catColorForCode;

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 text-2xl font-semibold tracking-wide uppercase">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  color,
  className,
  label,
}: {
  value: number;
  color?: string | undefined;
  className?: string | undefined;
  label?: string | undefined;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color ?? "var(--ember)",
          boxShadow: `0 0 12px -2px ${color ?? "var(--ember)"}`,
        }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 84,
  stroke = 7,
  color,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string | undefined;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? "var(--ember)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.max(0, Math.min(100, value))) / 100}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <span className="absolute grid place-items-center text-center">{children}</span>
    </div>
  );
}

export function XPBadge({ xp, pulse = false }: { xp: number; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] tracking-widest text-primary uppercase",
        pulse && "xp-pulse",
      )}
    >
      {xp.toLocaleString()} XP
    </span>
  );
}

export function LevelBadge({ level, title }: { level: number; title?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1">
      <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        LVL {level}
      </span>
      {title && <span className="text-xs text-foreground">{title}</span>}
    </span>
  );
}

export function Chip({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase",
        className,
      )}
      style={
        color
          ? {
              color,
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  color?: string | undefined;
}) {
  return (
    <div className="panel-2 p-4">
      <p className="eyebrow">{label}</p>
      <p
        className="mt-1.5 font-display text-3xl leading-none font-semibold"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FieldCallout({
  kind,
  children,
}: {
  kind: "FIELD NOTE" | "IMPORTANT" | "WARNING" | "SAFETY" | "PROCEDURE" | "REMEMBER" | "KNOWLEDGE CHECK";
  children: ReactNode;
}) {
  const tone: Record<string, string> = {
    "FIELD NOTE": "var(--cat-navigation)",
    IMPORTANT: "var(--ember)",
    WARNING: "var(--warning)",
    SAFETY: "var(--cat-medical)",
    PROCEDURE: "var(--cat-fundamentals)",
    REMEMBER: "var(--cat-water)",
    "KNOWLEDGE CHECK": "var(--success)",
  };
  const color = tone[kind];
  return (
    <aside
      className="my-6 rounded-r-lg border-l-2 bg-surface-2/70 px-5 py-4"
      style={{ borderColor: color }}
    >
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color }}>
        {kind}
      </p>
      <div className="mt-2 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </aside>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel grid place-items-center px-6 py-14 text-center">
      <div className="max-w-sm">
        <h3 className="text-lg font-semibold tracking-wide uppercase">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function LockedState({
  title,
  description,
  cta = "Explore Survivor",
}: {
  title: string;
  description: string;
  cta?: string;
}) {
  return (
    <div className="panel grain relative overflow-hidden px-6 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 320px at 50% 0%, color-mix(in oklab, var(--ember) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-md">
        <Eyebrow>Entitlement required</Eyebrow>
        <h3 className="mt-2 text-2xl font-semibold tracking-wide uppercase">{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <Link
          to="/plans"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {cta} →
        </Link>
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function Avatar({
  name,
  size = 36,
  color,
}: {
  name: string;
  size?: number | undefined;
  color?: string | undefined;
}) {
  const initials = name
    .split(/[\s_]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full border border-border font-mono font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `color-mix(in oklab, ${color ?? "var(--ember)"} 18%, var(--surface-2))`,
        color: color ?? "var(--ember)",
      }}
    >
      {initials}
    </span>
  );
}
