/**
 * Categories API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type { CategoryDetailResponse, CategoryListResponse } from "@/lib/api/types";

export function fetchCategories(): Promise<CategoryListResponse> {
  return request<CategoryListResponse>("/categories");
}

export function fetchCategoryDetail(slug: string): Promise<CategoryDetailResponse> {
  return request<CategoryDetailResponse>(`/categories/${slug}`);
}
