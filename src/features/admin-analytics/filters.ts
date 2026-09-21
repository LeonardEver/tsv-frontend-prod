/**
 * Shared analytics filter state.
 *
 * Filter state lives in the URL (`from`, `to`, `plan`, `country`,
 * `granularity`) rather than component state, so a filtered view is
 * shareable, survives tab navigation, and restores on back/forward. Tab
 * links carry the current search string forward.
 *
 * Two backend rules are enforced here rather than discovered as a 400:
 *
 * 1. `All time` omits `from` entirely. The aggregate endpoints then span
 *    everything, and the five series endpoints substitute their
 *    documented 30-day default — the response's `range` echo says which
 *    happened, so the UI never has to guess.
 * 2. A series range longer than 366 days is a validation error. We
 *    compute the window client-side and refuse to send the request,
 *    showing why. `from` after `to` is refused for the same reason.
 *
 * The bar itself lives in AnalyticsFilterBar.tsx — this module is
 * headless so it can stay a plain .ts file (react-refresh).
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type {
  AdminAnalyticsFilters,
  AdminGranularity,
  AdminPlanCode,
  AdminSeriesFilters,
} from "@/lib/api/types";

const MS_PER_DAY = 86_400_000;

/** Every URL parameter this surface owns. Iterated (not derived from
 * `Object.entries`) so the key type stays exact under strict linting. */
export const FILTER_KEYS = ["from", "to", "plan", "country", "granularity"] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export type FilterPatch = Partial<Record<FilterKey, string | undefined>>;

/** Backend SERIES_LIMITS: series endpoints reject a range longer than this. */
export const SERIES_MAX_DAYS = 366;

/** Sections backed by a series endpoint (`granularity`, 30-day default,
 * 366-day ceiling). Everything else is an aggregate endpoint and accepts
 * an unbounded all-time range. */
const SERIES_SECTIONS: readonly string[] = [
  "users",
  "engagement",
  "community",
  "gamification",
  "billing",
];

/** True when the current path is a series-backed section. */
export function isSeriesPath(pathname: string): boolean {
  const segment = pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return SERIES_SECTIONS.includes(segment);
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export type RangePreset = "7d" | "30d" | "90d" | "365d" | "all" | "custom";

const PRESETS: ReadonlyArray<{ id: Exclude<RangePreset, "custom" | "all">; label: string; days: number }> = [
  { id: "7d", label: "7d", days: 7 },
  { id: "30d", label: "30d", days: 30 },
  { id: "90d", label: "90d", days: 90 },
  { id: "365d", label: "12mo", days: 365 },
];

/** Inclusive day count between two `YYYY-MM-DD` dates, or `null` when
 * either is unparseable. */
export function inclusiveDays(from: string, to: string): number | null {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.floor((end - start) / MS_PER_DAY) + 1;
}

export interface AnalyticsFilterState {
  from: string | undefined;
  to: string | undefined;
  plan: AdminPlanCode | undefined;
  country: string | undefined;
  granularity: AdminGranularity | undefined;
}

export interface AnalyticsFilters extends AnalyticsFilterState {
  /**
   * Serializable, identity-stable request params. Query keys must hold
   * plain data — never the whole hook result, which carries callbacks.
   * `params` is for the aggregate endpoints; `seriesParams` adds the
   * bucket size the five series endpoints accept.
   */
  params: AdminAnalyticsFilters;
  seriesParams: AdminSeriesFilters;
  /** `range=undefined` means the backend's own default applies. */
  rangeDays: number | null;
  /** A series endpoint would reject this window (or it is inverted). */
  rangeRejected: boolean;
  rangeProblem: string | null;
  activePreset: RangePreset;
  setPreset: (preset: RangePreset) => void;
  update: (patch: FilterPatch) => void;
  reset: () => void;
}

function isPlanCode(value: string | null): value is AdminPlanCode {
  return value === "free" || value === "survivor" || value === "operator";
}

function isGranularity(value: string | null): value is AdminGranularity {
  return value === "day" || value === "week" || value === "month";
}

export function useAnalyticsFilters(): AnalyticsFilters {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<AnalyticsFilterState>(() => {
    const plan = searchParams.get("plan");
    const granularity = searchParams.get("granularity");
    return {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      plan: isPlanCode(plan) ? plan : undefined,
      country: searchParams.get("country") ?? undefined,
      granularity: isGranularity(granularity) ? granularity : undefined,
    };
  }, [searchParams]);

  const update = useCallback<AnalyticsFilters["update"]>(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const key of FILTER_KEYS) {
            const value = patch[key];
            if (value === undefined || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPreset = useCallback<AnalyticsFilters["setPreset"]>(
    (preset) => {
      if (preset === "all") {
        update({ from: undefined, to: undefined });
        return;
      }
      const match = PRESETS.find((entry) => entry.id === preset);
      if (!match) return;
      // Inclusive window: N days ending today.
      update({ from: utcDaysAgo(match.days - 1), to: utcToday() });
    },
    [update],
  );

  const reset = useCallback(() => {
    setSearchParams(() => new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const activePreset = useMemo<RangePreset>(() => {
    if (!filters.from && !filters.to) return "all";
    for (const entry of PRESETS) {
      if (filters.from === utcDaysAgo(entry.days - 1) && filters.to === utcToday()) return entry.id;
    }
    return "custom";
  }, [filters.from, filters.to]);

  const rangeDays = useMemo(() => {
    if (!filters.from) return null;
    // `to` defaults to today server-side, so mirror that when unset.
    return inclusiveDays(filters.from, filters.to ?? utcToday());
  }, [filters.from, filters.to]);

  let rangeProblem: string | null = null;
  if (rangeDays !== null && rangeDays <= 0) {
    rangeProblem = "The start date is after the end date.";
  } else if (rangeDays !== null && rangeDays > SERIES_MAX_DAYS) {
    rangeProblem = `This window is ${String(rangeDays)} days. Series endpoints accept at most ${String(SERIES_MAX_DAYS)} days — narrow the range or pick a shorter preset.`;
  }

  const params = useMemo<AdminAnalyticsFilters>(
    () => ({
      from: filters.from,
      to: filters.to,
      plan: filters.plan,
      country: filters.country,
    }),
    [filters.from, filters.to, filters.plan, filters.country],
  );

  const seriesParams = useMemo<AdminSeriesFilters>(
    () => ({ ...params, granularity: filters.granularity ?? "day" }),
    [params, filters.granularity],
  );

  return {
    ...filters,
    params,
    seriesParams,
    rangeDays,
    rangeRejected: rangeProblem !== null,
    rangeProblem,
    activePreset,
    setPreset,
    update,
    reset,
  };
}
