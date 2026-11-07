/**
 * Admin analytics API — /api/v1/admin/analytics/* (backend:
 * `src/modules/admin/api/routes.ts`).
 *
 * Every endpoint is `preHandler: [requireAuth, requireAdmin]`, so all
 * twelve answer 401 UNAUTHORIZED without a session and 403 FORBIDDEN for
 * an authenticated non-admin. The frontend never decides who is an
 * admin — it reads the status code (see use-admin-access.ts).
 *
 * Query building mirrors community.api.ts: URLSearchParams, with absent
 * values omitted entirely so the backend's own defaults apply. Sending
 * `from=` (empty) instead of omitting it would be a validation error, and
 * omitting `from` is meaningfully different from sending a date on
 * aggregate endpoints ("all time").
 */
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  AdminAnalyticsFilters,
  AdminAnalyticsResponseMap,
  AdminContentQuery,
  AdminGeographyQuery,
  AdminKnowledgeGapsQuery,
  AdminRetentionQuery,
  AdminSeriesFilters,
  AdminStalledUsersQuery,
} from "@/lib/api/types";

/** Drop `undefined`/`""` so the backend defaults take over. */
function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function analytics<T>(section: string, params: Record<string, string | number | undefined>): Promise<T> {
  return request<T>(`/admin/analytics/${section}${toQuery(params)}`);
}

// ── Capability probe ───────────────────────────────────────────────────────

/**
 * The probe's exact request path. `geography` with `limit=1` is the
 * cheapest response on the surface — a single-row aggregate — and the
 * Geography section's own limit control never offers `1`, so this URL
 * belongs to the probe alone. Exported so tests intercept that exact
 * request rather than a pattern that would also swallow real data calls.
 */
export const ADMIN_PROBE_PATH = "/admin/analytics/geography?limit=1";

/**
 * True when the session is an admin, false when the backend says it is
 * not (401/403). Any other failure propagates, so the caller can tell
 * "you are not an admin" apart from "we could not ask".
 */
export async function probeAdminAccess(): Promise<boolean> {
  try {
    await request<AdminAnalyticsResponseMap["geography"]>(ADMIN_PROBE_PATH);
    return true;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return false;
    throw err;
  }
}

// ── Aggregate endpoints (accept all-time ranges) ───────────────────────────

export function fetchOverview(
  filters: AdminAnalyticsFilters,
): Promise<AdminAnalyticsResponseMap["overview"]> {
  return analytics("overview", { ...filters });
}

export function fetchUsers(
  filters: AdminSeriesFilters,
): Promise<AdminAnalyticsResponseMap["users"]> {
  return analytics("users", { ...filters });
}

export function fetchLearning(
  filters: AdminAnalyticsFilters,
): Promise<AdminAnalyticsResponseMap["learning"]> {
  return analytics("learning", { ...filters });
}

export function fetchGeography(
  filters: AdminAnalyticsFilters & { limit?: number | undefined },
): Promise<AdminAnalyticsResponseMap["geography"]> {
  return analytics("geography", { ...filters });
}

// ── Series endpoints (30-day default window, 366-day maximum) ──────────────

export function fetchEngagement(
  filters: AdminSeriesFilters,
): Promise<AdminAnalyticsResponseMap["engagement"]> {
  return analytics("engagement", { ...filters });
}

export function fetchCommunity(
  filters: AdminSeriesFilters,
): Promise<AdminAnalyticsResponseMap["community"]> {
  return analytics("community", { ...filters });
}

export function fetchGamification(
  filters: AdminSeriesFilters,
): Promise<AdminAnalyticsResponseMap["gamification"]> {
  return analytics("gamification", { ...filters });
}

export function fetchBilling(
  filters: AdminSeriesFilters,
): Promise<AdminAnalyticsResponseMap["billing"]> {
  return analytics("billing", { ...filters });
}

// ── Paginated endpoints ────────────────────────────────────────────────────

export interface ContentParams extends AdminAnalyticsFilters, Pick<AdminContentQuery, "type" | "q" | "sort" | "limit" | "cursor"> {}

export function fetchContent(
  params: ContentParams,
): Promise<AdminAnalyticsResponseMap["content"]> {
  return analytics("content", { ...params });
}

export interface KnowledgeGapsParams
  extends AdminAnalyticsFilters,
    Pick<AdminKnowledgeGapsQuery, "limit" | "min_sample"> {}

export function fetchKnowledgeGaps(
  params: KnowledgeGapsParams,
): Promise<AdminAnalyticsResponseMap["knowledgeGaps"]> {
  return analytics("knowledge-gaps", { ...params });
}

export interface StalledUsersParams
  extends AdminAnalyticsFilters,
    Pick<AdminStalledUsersQuery, "days_stalled" | "module_id" | "limit" | "cursor"> {}

export function fetchStalledUsers(
  params: StalledUsersParams,
): Promise<AdminAnalyticsResponseMap["stalledUsers"]> {
  return analytics("stalled-users", { ...params });
}

export interface RetentionParams
  extends AdminAnalyticsFilters,
    Pick<AdminRetentionQuery, "cohort" | "limit"> {}

export function fetchRetention(
  params: RetentionParams,
): Promise<AdminAnalyticsResponseMap["retention"]> {
  return analytics("retention", { ...params });
}

export type { AdminGeographyQuery };
