/**
 * Profile API (Phase 21 §13). The profile payload never contains role,
 * internal ids or provider details — the backend enforces that, the
 * frontend never renders them.
 */
import { request } from "@/lib/api/client";
import type { ProfileResponse } from "@/lib/api/types";

export type ProfilePatch = Partial<{
  username: string | null;
  full_name: string | null;
  bio: string | null;
  country: string | null;
  timezone: string | null;
  preferred_language: string;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  reminder_preference: "daily" | "weekly" | "off";
  learning_goals: string | null;
  profile_visibility: "community" | "private";
  avatar_visibility: "community" | "private";
  community_display_name: string | null;
}>;

export function fetchProfile(): Promise<ProfileResponse> {
  return request<ProfileResponse>("/profile");
}

export function updateProfile(patch: ProfilePatch): Promise<ProfileResponse> {
  return request<ProfileResponse>("/profile", { method: "PATCH", body: patch });
}

export function deleteAccount(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/account", { method: "DELETE" });
}
