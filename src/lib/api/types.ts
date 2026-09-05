/**
 * Typed API contract accessors.
 *
 * Where the backend OpenAPI document declares a response schema, the
 * type derives from it (Ok<...>) — zero duplication. Where it does NOT
 * declare one (see FRONTEND BLOCKER G-15 in frontend/README.md), minimal
 * structural types derive from API-CONTRACT.md — the authoritative
 * contract document — and are clearly marked; nothing is invented.
 */
import type { paths } from "@/types/api";

export type ApiPaths = paths;

type Ok<T> =
  T extends { content?: { "application/json": infer R } } ? R : never;

export type CurrentUser = Ok<
  paths["/api/v1/auth/me"]["get"]["responses"]["200"]
>;

// ── Production auth phase — email/password credentials ─────────────────────

export type RegisterResponse = Ok<
  paths["/api/v1/auth/register"]["post"]["responses"]["201"]
>;

export type LoginResponse = Ok<
  paths["/api/v1/auth/login"]["post"]["responses"]["200"]
>;

export type VerifyEmailResponse = Ok<
  paths["/api/v1/auth/verify-email"]["post"]["responses"]["200"]
>;

export type ResendVerificationResponse = Ok<
  paths["/api/v1/auth/resend-verification"]["post"]["responses"]["200"]
>;

export type ForgotPasswordResponse = Ok<
  paths["/api/v1/auth/forgot-password"]["post"]["responses"]["200"]
>;

export type ResetPasswordResponse = Ok<
  paths["/api/v1/auth/reset-password"]["post"]["responses"]["200"]
>;

export type CategoryListResponse = Ok<
  paths["/api/v1/categories"]["get"]["responses"]["200"]
>;

export type CategoryDetailResponse = Ok<
  paths["/api/v1/categories/{category_slug}"]["get"]["responses"]["200"]
>;

export type ModuleListResponse = Ok<
  paths["/api/v1/modules"]["get"]["responses"]["200"]
>;

export type ModuleDetailResponse = Ok<
  paths["/api/v1/modules/{module_id}"]["get"]["responses"]["200"]
>;

/** Resource detail (Phase 16 D-1): `artifact_available` is a SERVER-side
 * verdict — the frontend never decides whether a resource is
 * downloadable (Phase 16 §24). */
export type ResourceResponse = Ok<
  paths["/api/v1/resources/{resource_id}"]["get"]["responses"]["200"]
>;

export type ProgressResponse = Ok<
  paths["/api/v1/progress"]["get"]["responses"]["200"]
>;

export type ModuleProgressResponse = Ok<
  paths["/api/v1/progress/modules/{module_id}"]["get"]["responses"]["200"]
>;

export type GamificationSummaryResponse = Ok<
  paths["/api/v1/gamification"]["get"]["responses"]["200"]
>;

export type AchievementsResponse = Ok<
  paths["/api/v1/gamification/achievements"]["get"]["responses"]["200"]
>;

/** Structured (default) lesson variant — the markdown debug variant is
 * excluded via Extract (it has `format`/`content` instead of sections). */
export type LessonResponse = Extract<
  Ok<paths["/api/v1/lessons/{lesson_id}"]["get"]["responses"]["200"]>,
  { sections: unknown }
>;

/** Safe quiz payload (API-CONTRACT E1): questions carry NO correct
 * answers or explanations — the schema enforces their absence. */
export type QuizResponse = Ok<
  paths["/api/v1/quizzes/{quiz_id}"]["get"]["responses"]["200"]
>;

/** Attempt creation response — identical body for 201 (new) and 200
 * (idempotent replay). */
export type AttemptCreateResponse = Ok<
  paths["/api/v1/quizzes/{quiz_id}/attempts"]["post"]["responses"]["201"]
>;

/** Authoritative submission result (E3 + E5 replay share this shape). */
export type QuizSubmissionResponse = Ok<
  paths["/api/v1/quizzes/{quiz_id}/attempts/{attempt_id}/answers"]["post"]["responses"]["200"]
>;

export type AttemptHistoryResponse = Ok<
  paths["/api/v1/quizzes/{quiz_id}/attempts"]["get"]["responses"]["200"]
>;

/** G-15 status: fully resolved for the learning surface (Phase 11),
 * lesson (Phase 12) and quiz (Phase 13) contracts. No structural
 * fallbacks remain. */

// ── Phase 21 — plans, entitlements, profile, community ─────────────────────

export type PlansResponse = Ok<paths["/api/v1/plans"]["get"]["responses"]["200"]>;

export type PlanCode = PlansResponse["plans"][number]["code"];

export type SubscriptionResponse = Ok<
  paths["/api/v1/subscription"]["get"]["responses"]["200"]
>;

export type UsageResponse = Ok<paths["/api/v1/usage"]["get"]["responses"]["200"]>;

// ── Stripe phase — billing ──────────────────────────────────────────────────

/** POST /billing/checkout: embedded checkout session OR an in-place
 * upgrade (the server decides — clients never see price ids). */
export type CheckoutStartResponse = Ok<
  paths["/api/v1/billing/checkout"]["post"]["responses"]["200"]
>;

export type BillingPortalResponse = Ok<
  paths["/api/v1/billing/portal"]["post"]["responses"]["200"]
>;

export type ProfileResponse = Ok<paths["/api/v1/profile"]["get"]["responses"]["200"]>;

export type CommunityCategoriesResponse = Ok<
  paths["/api/v1/community/categories"]["get"]["responses"]["200"]
>;

export type CommunityPostsResponse = Ok<
  paths["/api/v1/community/posts"]["get"]["responses"]["200"]
>;

export type CommunityPostResponse = Ok<
  paths["/api/v1/community/posts/{post_id}"]["get"]["responses"]["200"]
>;

export type CommunityCommentsResponse = Ok<
  paths["/api/v1/community/posts/{post_id}/comments"]["get"]["responses"]["200"]
>;

export type VoteResponse = Ok<
  paths["/api/v1/community/posts/{post_id}/vote"]["post"]["responses"]["200"]
>;

export type CommunityAuthor = CommunityPostResponse["author"];
export type CommunityPost = CommunityPostResponse;
