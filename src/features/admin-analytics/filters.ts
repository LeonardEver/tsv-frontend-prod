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

export type RangePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "365d" | "all" | "custom";

/**
 * Each preset is a closed window of `days` calendar days ending `offset`
 * days before today: `days: 1, offset: 0` is today alone, `days: 1,
 * offset: 1` is yesterday alone, `days: 7, offset: 0` is the inclusive
 * 7-day window ending today.
 *
 * CALENDAR days, not rolling 24-hour windows. The whole surface already
 * speaks in `YYYY-MM-DD` UTC days — this module dates every preset with
 * `toISOString()`, the series endpoints bucket on UTC boundaries, and the
 * response `range` echo comes back as plain dates. A rolling window would
 * have to be expressed as a timestamp, which is not a thing this API
 * accepts, and "Today" would stop matching the backend's own day.
 *
 * Order matters only for `activePreset`: the windows are matched
 * narrowest-first, so a single-day window can never be reported as a
 * multi-day one.
 */
const PRESETS: ReadonlyArray<{
  id: Exclude<RangePreset, "custom" | "all">;
  days: number;
  offset: number;
}> = [
  { id: "today", days: 1, offset: 0 },
  { id: "yesterday", days: 1, offset: 1 },
  { id: "7d", days: 7, offset: 0 },
  { id: "30d", days: 30, offset: 0 },
  { id: "90d", days: 90, offset: 0 },
  { id: "365d", days: 365, offset: 0 },
];

/** Exported for the preset tests: the window arithmetic is the part worth
 * pinning, and it must stay identical to what `setPreset` writes. */
export function presetWindow(entry: { days: number; offset: number }): {
  from: string;
  to: string;
} {
  return {
    from: utcDaysAgo(entry.offset + entry.days - 1),
    to: utcDaysAgo(entry.offset),
  };
}

/** The preset list, narrowest first. */
export const PRESET_WINDOWS = PRESETS;

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

/**
 * Why the window on screen would be refused. Returned as data rather than
 * as a sentence: the copy is translated, and this module is headless — the
 * filter bar owns the wording.
 */
export type RangeProblem =
  | { kind: "inverted" }
  | { kind: "tooLong"; days: number; maxDays: number };

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
  rangeProblem: RangeProblem | null;
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
      // Inclusive window: N calendar days ending `offset` days ago.
      update(presetWindow(match));
    },
    [update],
  );

  const reset = useCallback(() => {
    setSearchParams(() => new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const activePreset = useMemo<RangePreset>(() => {
    if (!filters.from && !filters.to) return "all";
    for (const entry of PRESETS) {
      const window = presetWindow(entry);
      if (filters.from === window.from && filters.to === window.to) return entry.id;
    }
    return "custom";
  }, [filters.from, filters.to]);

  const rangeDays = useMemo(() => {
    if (!filters.from) return null;
    // `to` defaults to today server-side, so mirror that when unset.
    return inclusiveDays(filters.from, filters.to ?? utcToday());
  }, [filters.from, filters.to]);

  let rangeProblem: RangeProblem | null = null;
  if (rangeDays !== null && rangeDays <= 0) {
    rangeProblem = { kind: "inverted" };
  } else if (rangeDays !== null && rangeDays > SERIES_MAX_DAYS) {
    rangeProblem = { kind: "tooLong", days: rangeDays, maxDays: SERIES_MAX_DAYS };
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
