/**
 * Dashboard API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type { GamificationSummaryResponse, ProgressResponse } from "@/lib/api/types";

export function fetchProgress(): Promise<ProgressResponse> {
  return request<ProgressResponse>("/progress");
}

export function fetchGamificationSummary(): Promise<GamificationSummaryResponse> {
  return request<GamificationSummaryResponse>("/gamification");
}
