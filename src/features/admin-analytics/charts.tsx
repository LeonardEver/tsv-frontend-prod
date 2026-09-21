/**
 * Dashboard primitives for the admin analytics surface.
 *
 * The app carries no charting dependency, so these are built from the
 * design tokens and layout idioms already in the repo (the `ProgressRing`
 * SVG and the shell's `panel`/`eyebrow` recipes) rather than introducing
 * one. Every component renders exactly the numbers it is handed — no
 * interpolation, no smoothing, no inferred values.
 *
 * Accessibility: charts are `role="img"` with a label that states the
 * bucket count and the peak, so a screen reader gets the shape of the
 * data rather than a run of unlabelled rectangles. Where the exact
 * numbers matter they are repeated in a `DataTable` beside the chart.
 */
import type { ReactNode } from "react";
import { cn } from "@/components/sa/primitives";
import { formatCount, formatPct } from "@/lib/format/format";
import type { AdminAnalyticsNotes, UnsupportedMetric } from "@/lib/api/types";

// ── Layout ─────────────────────────────────────────────────────────────────

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("panel mb-8 p-5", className)}>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-wide uppercase">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * KPI tile. Same markup recipe as the shared `Stat` primitive, but the
 * hint and delta accept nodes — a KPI's comparison line is a React node
 * (arrow, colour, prior value), not a string.
 */
export function KpiTile({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <div className="panel-2 p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-display text-3xl leading-none font-semibold">{value}</p>
      {hint !== undefined && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {delta !== undefined && <p className="mt-1.5 text-xs">{delta}</p>}
    </div>
  );
}

// ── Tables ─────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | undefined;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  emptyLabel = "No rows in this range.",
  minWidth = 640,
}: {
  columns: Array<Column<T>>;
  rows: readonly T[];
  getRowKey: (row: T, index: number) => string | number;
  caption: string;
  emptyLabel?: string | undefined;
  minWidth?: number | undefined;
}) {
  if (rows.length === 0) {
    return <p className="panel-2 p-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "py-2 pr-4 font-mono text-[10px] font-normal tracking-[0.14em] text-muted-foreground uppercase",
                  column.align === "right" && "text-right",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)} className="border-b border-border/60 last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn("py-2 pr-4 align-top", column.align === "right" && "text-right")}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Right-aligned numeric cell — tabular figures so columns line up. */
export function Num({ children, muted = false }: { children: ReactNode; muted?: boolean | undefined }) {
  return (
    <span className={cn("font-mono text-[13px]", muted && "text-muted-foreground")}>{children}</span>
  );
}

/** A `null` metric is missing data, never zero. Both the retention
 * windows and `avg_seconds_to_complete` rely on this distinction. */
export function MaybeNum({ value, format = formatCount }: { value: number | null; format?: (v: number) => string }) {
  if (value === null) return <span className="text-muted-foreground italic">not yet observable</span>;
  return <Num>{format(value)}</Num>;
}

// ── Charts ─────────────────────────────────────────────────────────────────

export function BarSeries<T>({
  data,
  valueOf,
  labelOf,
  ariaLabel,
  color = "var(--ember)",
  height = 128,
  formatValue = formatCount,
}: {
  data: readonly T[];
  valueOf: (row: T) => number;
  labelOf: (row: T) => string;
  ariaLabel: string;
  color?: string | undefined;
  height?: number | undefined;
  formatValue?: ((value: number) => string) | undefined;
}) {
  if (data.length === 0) {
    return <p className="panel-2 p-4 text-sm text-muted-foreground">No buckets in this range.</p>;
  }

  const max = data.reduce((acc, row) => Math.max(acc, valueOf(row)), 0);
  const peak = data.reduce((best, row) => (valueOf(row) > valueOf(best) ? row : best));
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="grid gap-2">
      <div
        role="img"
        aria-label={`${ariaLabel}. ${data.length} buckets. Peak ${formatValue(max)} at ${labelOf(peak)}.`}
        className="flex items-end gap-px"
        style={{ height }}
      >
        {data.map((row, index) => {
          const value = valueOf(row);
          return (
            <div
              key={`${labelOf(row)}-${String(index)}`}
              title={`${labelOf(row)}: ${formatValue(value)}`}
              className="min-w-px flex-1 rounded-t-sm transition-[height] duration-500"
              style={{
                // A zero bucket renders as a faint stub rather than an
                // invisible one, so "no activity" is visibly different
                // from "no bucket".
                height: `${max > 0 ? (value / max) * 100 : 0}%`,
                minHeight: value === 0 ? 1 : 2,
                background: color,
                opacity: value === 0 ? 0.18 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{first ? labelOf(first) : ""}</span>
        <span>{last ? labelOf(last) : ""}</span>
      </div>
    </div>
  );
}

export function Sparkline<T>({
  data,
  valueOf,
  ariaLabel,
  color = "var(--ember)",
  width = 180,
  height = 40,
}: {
  data: readonly T[];
  valueOf: (row: T) => number;
  ariaLabel: string;
  color?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
}) {
  if (data.length < 2) {
    return <p className="font-mono text-[11px] text-muted-foreground">Not enough buckets to trend.</p>;
  }

  const values = data.map(valueOf);
  const max = values.reduce((acc, value) => Math.max(acc, value), 0);
  const min = values.reduce((acc, value) => Math.min(acc, value), max);
  const span = max - min;

  const points = data
    .map((row, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = span === 0 ? height / 2 : height - 2 - ((valueOf(row) - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={`${ariaLabel}. ${data.length} buckets, low ${formatCount(min)}, high ${formatCount(max)}.`}
      width={width}
      height={height}
      className="overflow-visible"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function HBars<T>({
  rows,
  labelOf,
  valueOf,
  ariaLabel,
  color = "var(--ember)",
  formatValue = formatCount,
}: {
  rows: readonly T[];
  labelOf: (row: T) => string;
  valueOf: (row: T) => number;
  ariaLabel: string;
  color?: string | undefined;
  formatValue?: ((value: number) => string) | undefined;
}) {
  if (rows.length === 0) {
    return <p className="panel-2 p-4 text-sm text-muted-foreground">No rows in this range.</p>;
  }
  const max = rows.reduce((acc, row) => Math.max(acc, valueOf(row)), 0);

  return (
    <ul role="img" aria-label={ariaLabel} className="grid gap-3">
      {rows.map((row, index) => {
        const value = valueOf(row);
        return (
          <li key={`${labelOf(row)}-${String(index)}`} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{labelOf(row)}</span>
              <span className="shrink-0 font-mono text-[13px]">{formatValue(value)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${max > 0 ? (value / max) * 100 : 0}%`,
                  background: color,
                  boxShadow: `0 0 12px -2px ${color}`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Honesty blocks ─────────────────────────────────────────────────────────

/**
 * Renders one of the backend's `supported: false` objects. The reason
 * string is shown verbatim — it is the backend explaining why the metric
 * cannot be answered from this database, and paraphrasing it would make
 * the limitation sound like a UI gap instead of a data one.
 */
export function UnsupportedBlock({ label, metric }: { label: string; metric: UnsupportedMetric }) {
  return (
    <div className="panel-2 border-dashed p-4">
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        Not available
      </span>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{metric.reason}</p>
    </div>
  );
}

/**
 * The endpoint's own `notes` object, verbatim. Every analytics response
 * carries one precisely so a number cannot be read as something it is
 * not ("active" means learning-active, `xp_awarded` is inflated by
 * retries, and so on). Collapsed by default to keep pages scannable.
 */
export function MetricNotes({
  notes,
  title = "Definitions & caveats",
}: {
  notes: AdminAnalyticsNotes | undefined;
  title?: string | undefined;
}) {
  const entries = Object.entries(notes ?? {}).filter(([, value]) => value !== null);
  if (entries.length === 0) return null;

  return (
    <details className="mt-4 rounded-lg border border-border bg-surface-2/60 px-4 py-3">
      <summary className="cursor-pointer font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </summary>
      <dl className="mt-3 grid gap-2.5">
        {entries.map(([key, value]) => (
          <div key={key} className="grid gap-0.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-3">
            <dt className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              {key.replaceAll("_", " ")}
            </dt>
            <dd className="text-[13px] leading-relaxed text-foreground/80">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** The resolved window the server actually used — echoed back on every
 * response, including the substituted 30-day default on series endpoints. */
export function RangeEcho({ from, to }: { from: string | null; to: string }) {
  return (
    <p className="font-mono text-[11px] text-muted-foreground">
      {from === null ? "All time" : `${from} → ${to}`}
    </p>
  );
}

/** Previous-period delta. `previous` is `null` for an all-time query —
 * there is no comparable window, and inventing one would be a fiction. */
export function DeltaHint({
  current,
  previous,
  format = formatCount,
}: {
  current: number;
  previous: number | null | undefined;
  format?: ((value: number) => string) | undefined;
}) {
  if (previous === null || previous === undefined) {
    return <span className="text-muted-foreground">No comparison period</span>;
  }
  if (previous === 0) {
    return (
      <span className="text-muted-foreground">
        {current === 0 ? "No change (0 before)" : `New (0 → ${format(current)})`}
      </span>
    );
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.abs(delta) < 0.05 ? 0 : delta;
  return (
    <span className={cn(rounded === 0 ? "text-muted-foreground" : rounded > 0 ? "text-success" : "text-warning")}>
      {rounded > 0 ? "▲" : rounded < 0 ? "▼" : "—"} {formatPct(Math.abs(rounded), 1)} vs previous (
      {format(previous)})
    </span>
  );
}
