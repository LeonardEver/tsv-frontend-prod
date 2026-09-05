/**
 * Auth API calls (frontend spec §6).
 *
 * The backend is the ONLY authentication authority: the frontend calls
 * /auth/me, follows the backend-driven OIDC redirect, and posts logout.
 * No tokens, no client-side validation, no auth cryptography.
 */
import { request } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/api/types";

export function fetchCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>("/auth/me");
}

export function logoutSession(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}
