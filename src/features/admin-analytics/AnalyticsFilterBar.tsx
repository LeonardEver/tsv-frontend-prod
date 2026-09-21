/**
 * The shared analytics filter bar. State and validation live in
 * filters.tsx; this file is the rendering only.
 *
 * `series` swaps in the bucket-size control, which only the five series
 * endpoints accept.
 */
import type { ReactNode } from "react";
import { cn } from "@/components/sa/primitives";
import { COUNTRIES } from "@/lib/geo/countries";
import { useAnalyticsFilters } from "./filters";

const PRESETS: ReadonlyArray<{ id: "7d" | "30d" | "90d" | "365d"; label: string }> = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "365d", label: "12mo" },
];

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

const presetClass = (active: boolean) =>
  cn(
    "h-9 rounded-lg border px-3 text-[13px] transition-colors",
    active
      ? "border-primary/40 bg-primary/12 font-semibold text-primary"
      : "border-border bg-surface-2/70 text-foreground/80 hover:bg-surface-3",
  );

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AnalyticsFilterBar({ series }: { series: boolean }) {
  const filters = useAnalyticsFilters();

  return (
    <div className="panel mb-6 p-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="grid gap-1">
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Range
          </span>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Date range presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={filters.activePreset === preset.id}
                onClick={() => {
                  filters.setPreset(preset.id);
                }}
                className={presetClass(filters.activePreset === preset.id)}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={filters.activePreset === "all"}
              onClick={() => {
                filters.setPreset("all");
              }}
              className={presetClass(filters.activePreset === "all")}
            >
              All time
            </button>
          </div>
        </div>

        <Labelled label="From">
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(event) => {
              filters.update({ from: event.target.value });
            }}
            className={controlClass}
          />
        </Labelled>

        <Labelled label="To">
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(event) => {
              filters.update({ to: event.target.value });
            }}
            className={controlClass}
          />
        </Labelled>

        <Labelled label="Plan">
          <select
            value={filters.plan ?? ""}
            onChange={(event) => {
              filters.update({ plan: event.target.value });
            }}
            className={controlClass}
          >
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="survivor">Survivor</option>
            <option value="operator">Operator</option>
          </select>
        </Labelled>

        <Labelled label="Country">
          <select
            value={filters.country ?? ""}
            onChange={(event) => {
              filters.update({ country: event.target.value });
            }}
            className={controlClass}
          >
            <option value="">All countries</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Labelled>

        {series && (
          <Labelled label="Bucket">
            <select
              value={filters.granularity ?? "day"}
              onChange={(event) => {
                filters.update({ granularity: event.target.value });
              }}
              className={controlClass}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </Labelled>
        )}

        <button
          type="button"
          onClick={filters.reset}
          className="h-9 rounded-lg border border-border bg-surface-2/70 px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Reset
        </button>
      </div>

      {filters.rangeProblem && (
        <p
          role="alert"
          className="mt-3 rounded-lg border-l-2 border-[var(--warning)] bg-surface-2/70 px-3 py-2 text-[13px] text-foreground/90"
        >
          <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--warning)] uppercase">
            Range not requested ·{" "}
          </span>
          {filters.rangeProblem}
        </p>
      )}
    </div>
  );
}
