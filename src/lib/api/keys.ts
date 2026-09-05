/**
 * TanStack Query key factories (frontend spec §8.1).
 * Single source of truth for query keys — features never build keys
 * ad-hoc, which prevents cross-feature cache collisions.
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  content: {
    categories: ["categories"] as const,
    category: (slug: string) => ["categories", slug] as const,
    modules: ["modules"] as const,
    /** Complete module inventory across all pagination pages (the
     * expedition trail needs the full set; the plain `modules` key is
     * the first-page query used by list surfaces). */
    modulesAll: ["modules", "all"] as const,
    module: (moduleId: string) => ["modules", moduleId] as const,
    lesson: (lessonId: string) => ["lessons", lessonId] as const,
    quiz: (quizId: string) => ["quizzes", quizId] as const,
    resource: (resourceId: string) => ["resources", resourceId] as const,
  },
  learning: {
    progress: ["progress"] as const,
    moduleProgress: (moduleId: string) => ["progress", "modules", moduleId] as const,
    attempts: (quizId: string) => ["quizzes", quizId, "attempts"] as const,
    attempt: (quizId: string, attemptId: number) =>
      ["quizzes", quizId, "attempts", attemptId] as const,
  },
  gamification: {
    summary: ["gamification"] as const,
    xp: ["gamification", "xp"] as const,
    streak: ["gamification", "streak"] as const,
    achievements: ["gamification", "achievements"] as const,
  },
  plans: {
    plans: (userId: number) => ["plans", userId] as const,
    subscription: (userId: number) => ["subscription", userId] as const,
    usage: (userId: number) => ["usage", userId] as const,
  },
  profile: {
    current: (userId: number) => ["profile", userId] as const,
  },
  community: {
    categories: ["community", "categories"] as const,
    /** User-scoped: voted_by_me makes the payload user-specific, and
     * scoping guarantees cross-user cache isolation (Phase 21 §16). */
    posts: (userId: number, category?: string, sort?: string) =>
      ["community", "posts", userId, { category: category ?? null, sort: sort ?? "latest" }] as const,
    post: (userId: number, postId: number) => ["community", "posts", userId, postId] as const,
    comments: (userId: number, postId: number) =>
      ["community", "posts", userId, postId, "comments"] as const,
  },
} as const;
