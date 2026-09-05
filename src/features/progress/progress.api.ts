/**
 * Progress API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type {
  ModuleListResponse,
  ModuleProgressResponse,
  ProgressResponse,
} from "@/lib/api/types";

export function fetchProgress(): Promise<ProgressResponse> {
  return request<ProgressResponse>("/progress");
}

export function fetchModules(): Promise<ModuleListResponse> {
  // Full inventory at the max page size — the server default (20) silently
  // truncates the progress rows once the library passes 20 modules.
  return request<ModuleListResponse>("/modules?limit=100");
}

/** Per-module detail — the canonical `progress.modules` resource. */
export function fetchModuleProgress(moduleId: string): Promise<ModuleProgressResponse> {
  return request<ModuleProgressResponse>(`/progress/modules/${moduleId}`);
}
