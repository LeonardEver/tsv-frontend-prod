/**
 * Resources API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type { ResourceResponse } from "@/lib/api/types";

export function fetchResource(resourceId: string): Promise<ResourceResponse> {
  return request<ResourceResponse>(`/resources/${resourceId}`);
}
