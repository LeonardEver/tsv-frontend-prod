/**
 * Community API (Phase 21 §13). Survivor/Operator-gated server-side;
 * the frontend renders the upgrade gate, never the authority.
 *
 * Bodies are plain text — the backend sanitizes on write and React
 * escapes on render (no raw HTML, no Markdown HTML).
 */
import { request } from "@/lib/api/client";
import type {
  CommunityCategoriesResponse,
  CommunityCommentsResponse,
  CommunityPostResponse,
  CommunityPostsResponse,
  VoteResponse,
} from "@/lib/api/types";

export function fetchCommunityCategories(): Promise<CommunityCategoriesResponse> {
  return request<CommunityCategoriesResponse>("/community/categories");
}

export function fetchCommunityPosts(params: {
  category?: string;
  sort?: "latest" | "top" | "discussed";
  limit?: number;
  cursor?: string;
} = {}): Promise<CommunityPostsResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.sort) query.set("sort", params.sort);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request<CommunityPostsResponse>(`/community/posts${qs ? `?${qs}` : ""}`);
}

export function createCommunityPost(body: {
  category_code: string;
  title: string;
  body: string;
}): Promise<CommunityPostResponse> {
  return request<CommunityPostResponse>("/community/posts", {
    method: "POST",
    body,
  });
}

export function fetchCommunityPost(postId: number): Promise<CommunityPostResponse> {
  return request<CommunityPostResponse>(`/community/posts/${postId}`);
}

export function updateCommunityPost(
  postId: number,
  body: { title?: string; body?: string },
): Promise<CommunityPostResponse> {
  return request<CommunityPostResponse>(`/community/posts/${postId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteCommunityPost(postId: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/community/posts/${postId}`, { method: "DELETE" });
}

export function votePost(postId: number): Promise<VoteResponse> {
  return request<VoteResponse>(`/community/posts/${postId}/vote`, { method: "POST" });
}

export function fetchPostComments(
  postId: number,
  params: { limit?: number; cursor?: string } = {},
): Promise<CommunityCommentsResponse> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request<CommunityCommentsResponse>(
    `/community/posts/${postId}/comments${qs ? `?${qs}` : ""}`,
  );
}

export function createComment(
  postId: number,
  body: { body: string },
): Promise<CommunityCommentsResponse["comments"][number]> {
  return request<CommunityCommentsResponse["comments"][number]>(
    `/community/posts/${postId}/comments`,
    { method: "POST", body },
  );
}

export function updateComment(
  commentId: number,
  body: { body: string },
): Promise<CommunityCommentsResponse["comments"][number]> {
  return request<CommunityCommentsResponse["comments"][number]>(
    `/community/comments/${commentId}`,
    { method: "PATCH", body },
  );
}

export function deleteComment(commentId: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/community/comments/${commentId}`, {
    method: "DELETE",
  });
}

export function voteComment(commentId: number): Promise<VoteResponse> {
  return request<VoteResponse>(`/community/comments/${commentId}/vote`, {
    method: "POST",
  });
}

export function reportPost(
  postId: number,
  body: { reason: string; details?: string },
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/community/posts/${postId}/report`, {
    method: "POST",
    body,
  });
}

export function reportComment(
  commentId: number,
  body: { reason: string; details?: string },
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/community/comments/${commentId}/report`, {
    method: "POST",
    body,
  });
}
