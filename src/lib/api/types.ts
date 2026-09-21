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

// ── Admin analytics phase — /api/v1/admin/analytics/* ──────────────────────
//
// These twelve endpoints declare only their TOP-LEVEL response keys in
// OpenAPI. Every nested object and every list row is emitted as
// `{ [key: string]: unknown }` — the backend schemas set
// `additionalProperties: true` on purpose, so adding a metric never
// requires a schema change. `Ok<...>` is therefore useless below the top
// level, and the structural types here are transcribed from the
// authoritative contract document (`backend/docs/ADMIN_ANALYTICS_API.md`
// §4–§6) cross-checked against `backend/src/modules/admin/api/service.ts`.
// Nothing is invented: every field named here is one the API returns.
//
// Query parameter names, enums and defaults ARE declared in the spec, so
// those stay spec-derived (`…["get"]["parameters"]["query"]`).

export type AdminPlanCode = "free" | "survivor" | "operator";
export type AdminGranularity = "day" | "week" | "month";
export type AdminContentType = "lesson" | "module" | "quiz";

/** Shared range/scope filter accepted by every analytics endpoint. */
export interface AdminAnalyticsFilters {
  from?: string | undefined;
  to?: string | undefined;
  plan?: AdminPlanCode | undefined;
  country?: string | undefined;
}

/** Range + scope + bucket size — the series endpoints add `granularity`. */
export interface AdminSeriesFilters extends AdminAnalyticsFilters {
  granularity?: AdminGranularity | undefined;
}

/** Resolved window. `from` is `null` for an all-time query. */
export interface AdminAnalyticsRange {
  from: string | null;
  to: string;
}

/** Per-endpoint definition/limitation prose. Rendered verbatim in the UI. */
export type AdminAnalyticsNotes = Record<string, string | null>;

/**
 * `{ supported: false, reason }` — the backend's explicit statement that a
 * metric cannot be answered from this database. The UI renders it as an
 * "not available" panel; it is never approximated or filled in.
 */
export interface UnsupportedMetric {
  supported: false;
  reason: string;
}

export interface AdminAnalyticsPagination {
  next_cursor: string | null;
  has_more: boolean;
  page_size: number;
}

// ── /overview ──

/** Exactly the fifteen scalars the endpoint returns. */
export interface AdminOverviewMetrics {
  total_users: number;
  new_users: number;
  paying_users: number;
  free_users: number;
  trial_users: number;
  churned_users: number;
  active_users: number;
  active_days: number;
  lessons_completed: number;
  quiz_submissions: number;
  xp_awarded: number;
  lessons_completed_per_active_user: number;
  quiz_submissions_per_active_user: number;
  xp_per_active_user: number;
  active_days_per_active_user: number;
}

/** DAU/WAU/MAU measured **as of `to`** — learning activity, not visits. */
export interface AdminActivityWindows {
  dau: number;
  wau: number;
  mau: number;
  basis: string;
}

export interface AdminOverviewLimitations {
  revenue: UnsupportedMetric;
  plan_changes: UnsupportedMetric;
  visit_dau: UnsupportedMetric;
}

export interface AdminOverviewResponse {
  range: AdminAnalyticsRange;
  metrics: AdminOverviewMetrics;
  /** Equal-length preceding window; `null` for an all-time query. */
  previous: AdminOverviewMetrics | null;
  activity_windows: AdminActivityWindows;
  limitations: AdminOverviewLimitations;
}

// ── /users ──

export interface AdminUsersTotals {
  total_users: number;
  new_users: number;
  paying_users: number;
  free_users: number;
  churned_users: number;
}

/** Always three rows — one per plan code, zero-filled. */
export interface AdminPlanRow {
  plan: string;
  users: number;
  percentage_of_users: number;
  active_users: number;
  active_rate: number;
  trial_users: number;
  /** Accepted completions in range (quota-gated, retry-proof). */
  lessons_completed: number;
  /** Distinct lessons, from progress rows — a different question. */
  lessons_completed_distinct: number;
  quiz_submissions: number;
  active_days: number;
  xp_awarded: number;
  lessons_completed_per_active_user: number;
  xp_per_active_user: number;
}

export interface AdminSubscriptionStatusRow {
  status: string;
  users: number;
}

export interface AdminNewUsersBucket {
  bucket: string;
  new_users: number;
}

export interface AdminTopCountryRow {
  country: string;
  users: number;
  paying_users: number;
}

export interface AdminUsersResponse {
  range: AdminAnalyticsRange;
  totals: AdminUsersTotals;
  by_plan: AdminPlanRow[];
  by_subscription_status: AdminSubscriptionStatusRow[];
  new_users_series: AdminNewUsersBucket[];
  /** Hard-limited to 20 rows server-side. */
  top_countries: AdminTopCountryRow[];
  notes: AdminAnalyticsNotes;
}

// ── /engagement ──

export interface AdminEngagementTotals {
  learning_active_users: number;
  community_active_users: number;
  active_days: number;
  lesson_completions: number;
  quiz_submissions: number;
}

/** Dense bucket — every counter present, zero where the source was silent. */
export interface AdminEngagementBucket {
  bucket: string;
  active_users: number;
  lesson_completions: number;
  quiz_submissions: number;
  lessons_started: number;
  lessons_completed_events: number;
  quizzes_started: number;
  quizzes_completed: number;
  resource_downloads: number;
  community_posts: number;
  community_comments: number;
  community_votes: number;
  xp_awarded: number;
}

export interface AdminEngagementResponse {
  range: AdminAnalyticsRange;
  granularity: string;
  totals: AdminEngagementTotals;
  windows: Omit<AdminActivityWindows, "basis">;
  series: AdminEngagementBucket[];
  notes: AdminAnalyticsNotes;
}

// ── /learning ──

export type AdminFunnelStageName =
  | "users"
  | "lesson_started"
  | "lesson_completed"
  | "quiz_started"
  | "quiz_submitted"
  | "quiz_passed"
  | "module_progressed";

export interface AdminFunnelStage {
  stage: string;
  users: number;
  /** `null` on the first stage — there is no previous stage. */
  conversion_from_previous_pct: number | null;
  drop_off_from_previous_pct: number | null;
  conversion_from_top_pct: number;
}

export interface AdminLearningPlanRow {
  plan: string;
  lesson_started: number;
  lesson_completed: number;
}

export interface AdminLearningResponse {
  range: AdminAnalyticsRange;
  /** Always seven rows, in funnel order. */
  funnel: AdminFunnelStage[];
  by_plan: AdminLearningPlanRow[];
  notes: AdminAnalyticsNotes;
}

// ── /content ──

export type AdminContentPagination = AdminAnalyticsPagination;

interface AdminContentRowBase {
  id: string;
  module_id: string;
  category: string;
  difficulty: string;
}

export interface AdminContentLessonRow extends AdminContentRowBase {
  lesson_id: string;
  title: string;
  module_title: string;
  estimated_minutes: number | null;
  users_started: number;
  users_completed: number;
  /** `users_completed / users_started`, clamped to 100. */
  completion_rate: number;
  users_stalled: number;
  avg_seconds_to_complete: number | null;
  duration_sample: number;
}

export interface AdminContentModuleRow extends AdminContentRowBase {
  title: string;
  lessons_count: number;
  /** The MAXIMUM across its lessons — distinct users cannot be summed. */
  users_started: number;
  users_completed: number;
  completion_rate: number;
  quiz_attempts: number;
  quiz_pass_rate: number;
  quiz_avg_score: number | null;
}

export interface AdminContentQuizRow extends AdminContentRowBase {
  quiz_id: string;
  title: string;
  module_title: string;
  /** 0–1 fraction — NOT the 0–100 scale `avg_score` uses. */
  passing_score: number;
  unique_users: number;
  attempts: number;
  pass_rate: number;
  first_attempt_pass_rate: number;
  avg_score: number;
  avg_attempts_per_user: number;
}

export type AdminContentRow =
  | AdminContentLessonRow
  | AdminContentModuleRow
  | AdminContentQuizRow;

export interface AdminContentResponse {
  range: AdminAnalyticsRange;
  type: string;
  items: AdminContentRow[];
  pagination: AdminContentPagination;
  notes: AdminAnalyticsNotes;
}

// ── /knowledge-gaps ──

interface AdminGapRowBase {
  attempts: number;
  correct: number;
  /** 0–100, sorted worst first. */
  accuracy: number;
  users: number;
}

export interface AdminWeakObjectiveRow extends AdminGapRowBase {
  lo_id: number;
  lo_global_id: string;
  lo_label: string;
  description: string;
  lesson_id: string;
  lesson_title: string;
  module_id: string;
  module_title: string;
  category: string;
}

export interface AdminWeakQuestionRow extends AdminGapRowBase {
  question_db_id: number;
  question_id: string;
  question_text: string;
  difficulty: string;
  quiz_id: string;
  quiz_title: string;
  module_id: string;
}

export interface AdminWeakKnowledgeItemRow extends AdminGapRowBase {
  knowledge_db_id: number;
  knowledge_id: string;
  title: string;
  category: string;
  difficulty: string;
}

export interface AdminKnowledgeGapsResponse {
  range: AdminAnalyticsRange;
  /** Echoes the resolved floor — rows below it are excluded server-side. */
  min_sample: number;
  weakest_objectives: AdminWeakObjectiveRow[];
  weakest_questions: AdminWeakQuestionRow[];
  weakest_knowledge_items: AdminWeakKnowledgeItemRow[];
  notes: AdminAnalyticsNotes;
}

// ── /stalled-users ──

export type AdminStalledSignal =
  | "opened_lessons_without_completing"
  | "inactive_over_30_days"
  | "single_session_user"
  | "quizzes_without_lesson_progress";

export interface AdminStalledUserRow {
  user_id: number;
  display_name: string | null;
  email: string;
  plan: string;
  subscription_status: string | null;
  signed_up_at: string | null;
  last_activity_at: string;
  days_stalled: number;
  lessons_completed: number;
  quiz_attempts: number;
  active_days: number;
  current_module_id: string | null;
  current_module_title: string | null;
  current_lesson_id: string | null;
  current_lesson_title: string | null;
  last_progress_at: string | null;
  /** Proxy: lessons opened minus lessons completed. */
  unanswered_starts: number;
  signals: AdminStalledSignal[];
}

export interface AdminStalledThresholds {
  min_days_stalled: number;
  /** Always 7 — new users are new, not stalled. */
  min_account_age_days: number;
  definition: string;
  activity_source: string;
  not_measurable: string;
}

/** NOTE: `/stalled-users` returns no `range` key, unlike every sibling. */
export interface AdminStalledUsersResponse {
  thresholds: AdminStalledThresholds;
  users: AdminStalledUserRow[];
  pagination: AdminAnalyticsPagination;
}

// ── /retention ──

/** `null` — not "0" — when the cohort is younger than N days. A zero would
 * read as churn; the backend is explicit that this is missing data. */
export interface AdminRetentionWindow {
  users: number;
  rate: number;
}

export interface AdminRetentionCohort {
  cohort: string;
  cohort_size: number;
  max_observable_day: number;
  d1: AdminRetentionWindow | null;
  d7: AdminRetentionWindow | null;
  d14: AdminRetentionWindow | null;
  d30: AdminRetentionWindow | null;
}

export interface AdminRetentionDefinition {
  activity: string;
  day_boundary: string;
  observability: string;
}

export interface AdminRetentionResponse {
  range: AdminAnalyticsRange;
  definition: AdminRetentionDefinition;
  cohorts: AdminRetentionCohort[];
}

// ── /community ──

export interface AdminCommunityTotals {
  posts: number;
  comments: number;
  votes: number;
  reports: number;
  active_users: number;
}

export interface AdminCommunityAuthors {
  posts: number;
  comments: number;
  votes: number;
}

export interface AdminCommunityPlanRow {
  plan: string;
  authors: number;
  posts: number;
  comments: number;
}

export interface AdminCommunityBucket {
  bucket: string;
  posts: number;
  comments: number;
  votes: number;
}

export interface AdminCommunityResponse {
  range: AdminAnalyticsRange;
  totals: AdminCommunityTotals;
  unique_authors: AdminCommunityAuthors;
  by_plan: AdminCommunityPlanRow[];
  series: AdminCommunityBucket[];
  notes: AdminAnalyticsNotes;
}

// ── /gamification ──

export interface AdminXpBucket {
  bucket: string;
  xp_awarded: number;
  users: number;
}

export interface AdminXpBlock {
  /** "XP awarded", not "XP earned once" — retries inflate this. */
  total_awarded: number;
  per_active_user: number;
  series: AdminXpBucket[];
}

export interface AdminStreakBucket {
  bucket: string;
  users: number;
}

export interface AdminStreaksBlock {
  users_with_active_streak: number;
  avg_current_streak: number;
  avg_longest_streak: number;
  max_current_streak: number;
  max_longest_streak: number;
  /** Sparse — buckets with no users are absent, not zero. */
  distribution: AdminStreakBucket[];
  /** NOT an engagement signal — rows are created lazily by any read. */
  streak_rows: number;
}

export interface AdminAchievementRow {
  achievement_key: string;
  title: string;
  unlocks: number;
}

export interface AdminAchievementsBlock {
  unlocked_in_range: number;
  users_with_unlocks: number;
  /** 0 ⇒ definitions were never seeded and nothing can unlock. */
  definition_count: number;
  top: AdminAchievementRow[];
}

export interface AdminGamificationResponse {
  range: AdminAnalyticsRange;
  xp: AdminXpBlock;
  streaks: AdminStreaksBlock;
  achievements: AdminAchievementsBlock;
  notes: AdminAnalyticsNotes;
}

// ── /billing ──

export interface AdminBillingPlanRow {
  plan: string;
  users: number;
}

export interface AdminBillingStatusRow {
  status: string;
  users: number;
}

export interface AdminSubscriptionsBlock {
  /** `subscriptions.plan_code` as stored — NOT the effective plan. */
  by_plan: AdminBillingPlanRow[];
  by_status: AdminBillingStatusRow[];
  total_rows: number;
}

/** §5.1 effective plan, after the status/period matrix is applied. */
export interface AdminEffectivePlans {
  paying_users: number;
  free_users: number;
  trial_users: number;
  churned_users: number;
}

export interface AdminMovementBucket {
  bucket: string;
  new_subscriptions: number;
  cancellations: number;
}

export interface AdminBillingMovement {
  new_subscriptions: number;
  cancellations: number;
  /** Subscriptions *currently* trialing whose period began in range. */
  trials: number;
  series: AdminMovementBucket[];
}

export interface AdminBillingResponse {
  range: AdminAnalyticsRange;
  subscriptions: AdminSubscriptionsBlock;
  effective_plans: AdminEffectivePlans;
  movement: AdminBillingMovement;
  /** Always `supported: false` — no monetary amount exists in Postgres. */
  revenue: UnsupportedMetric;
  /** Always `supported: false` — no plan-change history is recorded. */
  upgrades_downgrades: UnsupportedMetric;
  notes: AdminAnalyticsNotes;
}

// ── /geography ──

export interface AdminGeographyCountryRow {
  country: string;
  users: number;
  /** Percentage of users **with** a country, not of all users. */
  percentage_of_users: number;
  active_users: number;
  paying_users: number;
  trial_users: number;
  active_rate: number;
  paying_rate: number;
}

/** Coverage is reported explicitly because `users.country` is nullable and
 * not required at signup. */
export interface AdminGeographyTotals {
  users_with_country: number;
  users_without_country: number;
  coverage_pct: number;
}

export interface AdminGeographyResponse {
  supported: boolean;
  range: AdminAnalyticsRange;
  totals: AdminGeographyTotals;
  countries: AdminGeographyCountryRow[];
  notes: AdminAnalyticsNotes;
}

// ── Spec-derived query parameter types ─────────────────────────────────────
// These stay generated: parameter names, enums, ranges and defaults are all
// declared in the OpenAPI document.

export type AdminContentQuery = NonNullable<
  paths["/api/v1/admin/analytics/content"]["get"]["parameters"]["query"]
>;

export type AdminKnowledgeGapsQuery = NonNullable<
  paths["/api/v1/admin/analytics/knowledge-gaps"]["get"]["parameters"]["query"]
>;

export type AdminStalledUsersQuery = NonNullable<
  paths["/api/v1/admin/analytics/stalled-users"]["get"]["parameters"]["query"]
>;

export type AdminRetentionQuery = NonNullable<
  paths["/api/v1/admin/analytics/retention"]["get"]["parameters"]["query"]
>;

export type AdminGeographyQuery = NonNullable<
  paths["/api/v1/admin/analytics/geography"]["get"]["parameters"]["query"]
>;

/**
 * Section → response type. The API layer and the tabs address endpoints
 * by section name, so neither has to import twelve aliases.
 */
export interface AdminAnalyticsResponseMap {
  overview: AdminOverviewResponse;
  users: AdminUsersResponse;
  engagement: AdminEngagementResponse;
  learning: AdminLearningResponse;
  content: AdminContentResponse;
  knowledgeGaps: AdminKnowledgeGapsResponse;
  stalledUsers: AdminStalledUsersResponse;
  retention: AdminRetentionResponse;
  community: AdminCommunityResponse;
  gamification: AdminGamificationResponse;
  billing: AdminBillingResponse;
  geography: AdminGeographyResponse;
}
