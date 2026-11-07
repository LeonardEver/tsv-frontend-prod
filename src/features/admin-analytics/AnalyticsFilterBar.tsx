/**
 * The shared analytics filter bar. State and validation live in
 * filters.tsx; this file is the rendering only.
 *
 * `series` swaps in the bucket-size control, which only the five series
 * endpoints accept.
 *
 * Labels come from the console's dictionary. The preset VALUES ("7d",
 * "365d") are range identities, not copy — they are unchanged between
 * languages; only the displayed labels are translated.
 */
import type { ReactNode } from "react";
import { cn } from "@/components/sa/primitives";
import { COUNTRIES } from "@/lib/geo/countries";
import { useAnalyticsFilters } from "./filters";
import { useTr } from "./i18n";

type PresetId = "today" | "yesterday" | "7d" | "30d" | "90d" | "365d";

/** Rendered in this order; the window itself is computed in filters.ts so
 * the bar never has to know what "yesterday" means. */
const PRESETS: ReadonlyArray<{ id: PresetId; labelKey: `filters.preset.${PresetId}` }> = [
  { id: "today", labelKey: "filters.preset.today" },
  { id: "yesterday", labelKey: "filters.preset.yesterday" },
  { id: "7d", labelKey: "filters.preset.7d" },
  { id: "30d", labelKey: "filters.preset.30d" },
  { id: "90d", labelKey: "filters.preset.90d" },
  { id: "365d", labelKey: "filters.preset.365d" },
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
  const { t, tf } = useTr();

  return (
    <div className="panel mb-6 p-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="grid gap-1">
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("filters.range")}
          </span>
          <div className="flex flex-wrap gap-1" role="group" aria-label={t("filters.presetsAria")}>
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
                {t(preset.labelKey)}
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
              {t("filters.allTime")}
            </button>
          </div>
        </div>

        <Labelled label={t("filters.from")}>
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(event) => {
              filters.update({ from: event.target.value });
            }}
            className={controlClass}
          />
        </Labelled>

        <Labelled label={t("filters.to")}>
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(event) => {
              filters.update({ to: event.target.value });
            }}
            className={controlClass}
          />
        </Labelled>

        <Labelled label={t("filters.plan")}>
          <select
            value={filters.plan ?? ""}
            onChange={(event) => {
              filters.update({ plan: event.target.value });
            }}
            className={controlClass}
          >
            <option value="">{t("filters.allPlans")}</option>
            <option value="free">{t("filters.planFree")}</option>
            <option value="survivor">{t("filters.planSurvivor")}</option>
            <option value="operator">{t("filters.planOperator")}</option>
          </select>
        </Labelled>

        <Labelled label={t("filters.country")}>
          <select
            value={filters.country ?? ""}
            onChange={(event) => {
              filters.update({ country: event.target.value });
            }}
            className={controlClass}
          >
            <option value="">{t("filters.allCountries")}</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Labelled>

        {series && (
          <Labelled label={t("filters.bucket")}>
            <select
              value={filters.granularity ?? "day"}
              onChange={(event) => {
                filters.update({ granularity: event.target.value });
              }}
              className={controlClass}
            >
              <option value="day">{t("filters.granularityDay")}</option>
              <option value="week">{t("filters.granularityWeek")}</option>
              <option value="month">{t("filters.granularityMonth")}</option>
            </select>
          </Labelled>
        )}

        <button
          type="button"
          onClick={filters.reset}
          className="h-9 rounded-lg border border-border bg-surface-2/70 px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("filters.reset")}
        </button>
      </div>

      {filters.rangeProblem && (
        <p
          role="alert"
          className="mt-3 rounded-lg border-l-2 border-[var(--warning)] bg-surface-2/70 px-3 py-2 text-[13px] text-foreground/90"
        >
          <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--warning)] uppercase">
            {t("filters.rangeNotRequested")}{" "}
          </span>
          {filters.rangeProblem.kind === "inverted"
            ? t("filters.rangeInverted")
            : tf("filters.rangeTooLong", {
              days: filters.rangeProblem.days,
              maxDays: filters.rangeProblem.maxDays,
            })}
        </p>
      )}
    </div>
  );
}
