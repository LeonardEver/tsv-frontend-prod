/**
 * Gamification API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type { AchievementsResponse } from "@/lib/api/types";

/** Achievements list — earned + unearned with authoritative progress. */
export function fetchAchievements(): Promise<AchievementsResponse> {
  return request<AchievementsResponse>("/gamification/achievements");
}
