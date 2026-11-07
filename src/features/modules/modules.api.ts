/**
 * Modules API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type { ModuleDetailResponse, ModuleListResponse } from "@/lib/api/types";

export function fetchModule(moduleId: string): Promise<ModuleDetailResponse> {
  return request<ModuleDetailResponse>(`/modules/${moduleId}`);
}

/**
 * Complete published-module inventory across all pagination pages.
 * The expedition trail must render the WHOLE curriculum — truncating to
 * the first page would silently hide missions. The page cap is a
 * defensive backstop only: at the maximum page size (100) it covers a
 * far larger library than the fixed 9-module content set.
 */
export async function fetchAllModules(): Promise<ModuleListResponse> {
  const MAX_PAGES = 10;
  const modules: ModuleListResponse["modules"] = [];
  let cursor: string | null = null;

  for (let pages = 0; pages < MAX_PAGES; pages += 1) {
    const query: string = cursor
      ? `/modules?limit=100&cursor=${encodeURIComponent(cursor)}`
      : "/modules?limit=100";
    const page: ModuleListResponse = await request<ModuleListResponse>(query);
    modules.push(...page.modules);
    cursor = page.pagination.next_cursor;
    if (!cursor) break;
  }

  return { modules, pagination: { next_cursor: null, has_more: false, page_size: modules.length } };
}
