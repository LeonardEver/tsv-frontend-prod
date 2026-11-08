/**
 * TanStack Query key factories (frontend spec §8.1).
 * Single source of truth for query keys — features never build keys
 * ad-hoc, which prevents cross-feature cache collisions.
 */
import { getLocale } from "@/i18n";
import { normalizeLocale } from "@/i18n/config";

/** Mutations invalidate every cached language of the same canonical entity. */
export function allLocales(key: readonly unknown[]): readonly unknown[] {
  return normalizeLocale(key.at(-1)) !== null ? key.slice(0, -1) : key;
}

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  notifications: {
    all: (userId: number) => ["notifications", userId] as const,
    feed: (userId: number) => ["notifications", userId, getLocale()] as const,
  },
  content: {
    get categories() { return ["categories", getLocale()] as const; },
    category: (slug: string) => ["categories", slug, getLocale()] as const,
    get modules() { return ["modules", getLocale()] as const; },
    /** Complete module inventory across all pagination pages (the
     * expedition trail needs the full set; the plain `modules` key is
     * the first-page query used by list surfaces). */
    get modulesAll() { return ["modules", "all", getLocale()] as const; },
    module: (moduleId: string) => ["modules", moduleId, getLocale()] as const,
    lesson: (lessonId: string) => ["lessons", lessonId, getLocale()] as const,
    quiz: (quizId: string) => ["quizzes", quizId, getLocale()] as const,
    resource: (resourceId: string) => ["resources", resourceId, getLocale()] as const,
  },
  learning: {
    progress: ["progress"] as const,
    moduleProgress: (moduleId: string) => ["progress", "modules", moduleId] as const,
    attempts: (quizId: string) => ["quizzes", quizId, "attempts"] as const,
    attempt: (quizId: string, attemptId: number) =>
      ["quizzes", quizId, "attempts", attemptId, getLocale()] as const,
  },
  gamification: {
    summary: ["gamification"] as const,
    xp: ["gamification", "xp"] as const,
    streak: ["gamification", "streak"] as const,
    get achievements() { return ["gamification", "achievements", getLocale()] as const; },
  },
  plans: {
    plans: (userId: number) => ["plans", userId, getLocale()] as const,
    subscription: (userId: number) => ["subscription", userId] as const,
    usage: (userId: number) => ["usage", userId] as const,
  },
  profile: {
    current: (userId: number) => ["profile", userId] as const,
  },
  community: {
    get categories() { return ["community", "categories", getLocale()] as const; },
    /** User-scoped: voted_by_me makes the payload user-specific, and
     * scoping guarantees cross-user cache isolation (Phase 21 §16). */
    posts: (userId: number, category?: string, sort?: string) =>
      ["community", "posts", userId, { category: category ?? null, sort: sort ?? "latest" }] as const,
    post: (userId: number, postId: number) => ["community", "posts", userId, postId] as const,
    comments: (userId: number, postId: number) =>
      ["community", "posts", userId, postId, "comments"] as const,
  },
  /**
   * Admin analytics (/api/v1/admin/analytics/*). Every analytics key
   * carries the full filter set, so changing range, plan or country
   * selects a different cache entry rather than rewriting a stale one.
   *
   * `access` is the capability probe — see features/admin-analytics/
   * use-admin-access.ts.
   */
  admin: {
    access: ["admin", "access"] as const,
    analytics: (section: string, filters?: unknown) =>
      ["admin", "analytics", section, filters ?? null] as const,
  },
} as const;
