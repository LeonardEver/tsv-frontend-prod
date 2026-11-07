/**
 * MSW fixtures + handlers for /api/v1/admin/analytics/*.
 *
 * Same rules as handlers.ts: fixtures are typed against the app's
 * contract types with `satisfies`, shapes mirror the real backend, and
 * handlers encode NO business rules.
 *
 * These live in their own module only because twelve endpoints plus their
 * row fixtures would otherwise double the size of handlers.ts.
 *
 * The capability probe is the subtle part: `/admin/analytics/geography`
 * answers the probe (`limit=1`) with 403 by default, so every existing
 * test that mounts AppShell sees a NON-admin session and the navigation
 * entry stays hidden. Admin scenarios override that single handler with
 * `server.use(...)`, which also satisfies the probe.
 */
import { http, HttpResponse } from "msw";
import { ADMIN_PROBE_PATH } from "@/features/admin-analytics/analytics.api";
import type {
  AdminAnalyticsResponseMap,
  AdminContentResponse,
  AdminGamificationResponse,
  AdminGeographyResponse,
  AdminKnowledgeGapsResponse,
  AdminLearningResponse,
  AdminOverviewResponse,
  AdminRetentionResponse,
  AdminStalledUsersResponse,
  AdminUsersResponse,
  AdminBillingResponse,
  AdminCommunityResponse,
  AdminEngagementResponse,
} from "@/lib/api/types";

const API = "*/api/v1";

function errorEnvelope(code: string, message: string, requestId = "test-req-1") {
  return { error: { code, message, request_id: requestId } };
}

const RANGE = { from: "2026-08-23", to: "2026-09-21" };

// ── Fixtures ───────────────────────────────────────────────────────────────

export const adminOverview = {
  range: RANGE,
  metrics: {
    total_users: 120,
    new_users: 34,
    paying_users: 41,
    free_users: 79,
    trial_users: 3,
    churned_users: 2,
    active_users: 52,
    active_days: 96,
    lessons_completed: 310,
    quiz_submissions: 84,
    xp_awarded: 15_500,
    lessons_completed_per_active_user: 5.96,
    quiz_submissions_per_active_user: 1.62,
    xp_per_active_user: 298.08,
    active_days_per_active_user: 1.85,
  },
  previous: {
    total_users: 86,
    new_users: 22,
    paying_users: 35,
    free_users: 51,
    trial_users: 4,
    churned_users: 1,
    active_users: 40,
    active_days: 74,
    lessons_completed: 240,
    quiz_submissions: 61,
    xp_awarded: 12_000,
    lessons_completed_per_active_user: 6,
    quiz_submissions_per_active_user: 1.53,
    xp_per_active_user: 300,
    active_days_per_active_user: 1.85,
  },
  activity_windows: {
    dau: 9,
    wau: 31,
    mau: 52,
    basis:
      "Active = completed at least one lesson, or submitted at least one quiz, on that day (learning activity, not visits).",
  },
  limitations: {
    revenue: { supported: false, reason: "No monetary amount is stored in this database." },
    plan_changes: { supported: false, reason: "No plan-change history is recorded." },
    visit_dau: { supported: false, reason: "No app-open event is recorded." },
  },
} satisfies AdminOverviewResponse;

export const adminUsers = {
  range: RANGE,
  totals: { total_users: 120, new_users: 34, paying_users: 41, free_users: 79, churned_users: 2 },
  by_plan: [
    {
      plan: "free",
      users: 79,
      percentage_of_users: 65.83,
      active_users: 30,
      active_rate: 37.97,
      trial_users: 3,
      lessons_completed: 150,
      lessons_completed_distinct: 88,
      quiz_submissions: 30,
      active_days: 52,
      xp_awarded: 7_500,
      lessons_completed_per_active_user: 5,
      xp_per_active_user: 250,
    },
    {
      plan: "survivor",
      users: 34,
      percentage_of_users: 28.33,
      active_users: 18,
      active_rate: 52.94,
      trial_users: 0,
      lessons_completed: 130,
      lessons_completed_distinct: 71,
      quiz_submissions: 42,
      active_days: 36,
      xp_awarded: 6_500,
      lessons_completed_per_active_user: 7.22,
      xp_per_active_user: 361.11,
    },
    {
      plan: "operator",
      users: 7,
      percentage_of_users: 5.83,
      active_users: 4,
      active_rate: 57.14,
      trial_users: 0,
      lessons_completed: 30,
      lessons_completed_distinct: 25,
      quiz_submissions: 12,
      active_days: 8,
      xp_awarded: 1_500,
      lessons_completed_per_active_user: 7.5,
      xp_per_active_user: 375,
    },
  ],
  by_subscription_status: [
    { status: "active", users: 38 },
    { status: "trialing", users: 3 },
    { status: "canceled", users: 2 },
  ],
  new_users_series: [
    { bucket: "2026-09-14", new_users: 6 },
    { bucket: "2026-09-15", new_users: 9 },
    { bucket: "2026-09-16", new_users: 4 },
  ],
  top_countries: [
    { country: "BR", users: 48, paying_users: 19 },
    { country: "US", users: 22, paying_users: 11 },
  ],
  notes: {
    plan_definition: "Effective plan, after the subscription status matrix is applied.",
    churn_definition: "Non-free plan on file whose effective plan is now free.",
    lessons: "lessons_completed counts accepted completions; retries do not inflate it.",
  },
} satisfies AdminUsersResponse;

export const adminEngagement = {
  range: RANGE,
  granularity: "day",
  totals: {
    learning_active_users: 52,
    community_active_users: 17,
    active_days: 96,
    lesson_completions: 310,
    quiz_submissions: 84,
  },
  windows: { dau: 9, wau: 31, mau: 52 },
  series: [
    {
      bucket: "2026-09-19",
      active_users: 7,
      lesson_completions: 18,
      quiz_submissions: 5,
      lessons_started: 21,
      lessons_completed_events: 19,
      quizzes_started: 6,
      quizzes_completed: 5,
      resource_downloads: 2,
      community_posts: 1,
      community_comments: 3,
      community_votes: 4,
      xp_awarded: 950,
    },
    {
      bucket: "2026-09-20",
      active_users: 11,
      lesson_completions: 24,
      quiz_submissions: 8,
      lessons_started: 27,
      lessons_completed_events: 25,
      quizzes_started: 9,
      quizzes_completed: 8,
      resource_downloads: 4,
      community_posts: 2,
      community_comments: 5,
      community_votes: 7,
      xp_awarded: 1_240,
    },
  ],
  notes: {
    active_user: "Completed a lesson or submitted a quiz on that day.",
    day_boundary: "All bucket boundaries are UTC.",
    counts: "Retries inflate learning_events counts but not lesson_completions.",
  },
} satisfies AdminEngagementResponse;

export const adminLearning = {
  range: RANGE,
  funnel: [
    {
      stage: "users",
      users: 120,
      conversion_from_previous_pct: null,
      drop_off_from_previous_pct: null,
      conversion_from_top_pct: 100,
    },
    {
      stage: "lesson_started",
      users: 74,
      conversion_from_previous_pct: 61.67,
      drop_off_from_previous_pct: 38.33,
      conversion_from_top_pct: 61.67,
    },
    {
      stage: "lesson_completed",
      users: 61,
      conversion_from_previous_pct: 82.43,
      drop_off_from_previous_pct: 17.57,
      conversion_from_top_pct: 50.83,
    },
    {
      stage: "quiz_started",
      users: 40,
      conversion_from_previous_pct: 65.57,
      drop_off_from_previous_pct: 34.43,
      conversion_from_top_pct: 33.33,
    },
    {
      stage: "quiz_submitted",
      users: 33,
      conversion_from_previous_pct: 82.5,
      drop_off_from_previous_pct: 17.5,
      conversion_from_top_pct: 27.5,
    },
    {
      stage: "quiz_passed",
      users: 24,
      conversion_from_previous_pct: 72.73,
      drop_off_from_previous_pct: 27.27,
      conversion_from_top_pct: 20,
    },
    {
      stage: "module_progressed",
      users: 29,
      conversion_from_previous_pct: 120.83,
      drop_off_from_previous_pct: -20.83,
      conversion_from_top_pct: 24.17,
    },
  ],
  by_plan: [
    { plan: "free", lesson_started: 48, lesson_completed: 38 },
    { plan: "survivor", lesson_started: 20, lesson_completed: 18 },
    { plan: "operator", lesson_started: 6, lesson_completed: 5 },
  ],
  notes: {
    stages_are_not_nested:
      "Stages count distinct users per action, not a subset of the stage above.",
    lesson_started_availability: "lesson_started began being recorded when this module shipped.",
    module_progressed: "Module progress is a binary proxy.",
    attempts: "Only completed attempts are counted.",
  },
} satisfies AdminLearningResponse;

export const adminContent = {
  range: RANGE,
  type: "lesson",
  items: [
    {
      id: "WAT-boiling-L01",
      lesson_id: "WAT-boiling-L01",
      title: "Boiling water for purification",
      module_id: "WAT-boiling",
      module_title: "Boiling",
      category: "water",
      difficulty: "beginner",
      estimated_minutes: 12,
      users_started: 34,
      users_completed: 28,
      completion_rate: 82.35,
      users_stalled: 6,
      avg_seconds_to_complete: 540,
      duration_sample: 28,
    },
    {
      id: "WAT-filter-L01",
      lesson_id: "WAT-filter-L01",
      title: "Improvised filtration",
      module_id: "WAT-filter",
      module_title: "Filtration",
      category: "water",
      difficulty: "intermediate",
      estimated_minutes: null,
      users_started: 21,
      users_completed: 14,
      completion_rate: 66.67,
      users_stalled: 7,
      avg_seconds_to_complete: null,
      duration_sample: 0,
    },
  ],
  pagination: { next_cursor: null, has_more: false, page_size: 25 },
  notes: {
    completion_rate: "users_completed / users_started, clamped to 100.",
    duration_caveat: "avg_seconds_to_complete ignores re-completions.",
  },
} satisfies AdminContentResponse;

export const adminKnowledgeGaps = {
  range: RANGE,
  min_sample: 5,
  weakest_objectives: [
    {
      lo_id: 7,
      lo_global_id: "LO-WAT-007",
      lo_label: "Identify when water must be treated",
      description: "Distinguish safe from unsafe sources.",
      lesson_id: "WAT-boiling-L01",
      lesson_title: "Boiling water for purification",
      module_id: "WAT-boiling",
      module_title: "Boiling",
      category: "water",
      attempts: 18,
      correct: 6,
      accuracy: 33.33,
      users: 11,
    },
  ],
  weakest_questions: [
    {
      question_db_id: 42,
      question_id: "WAT-boiling-Q01",
      question_text: "How long must water boil at sea level?",
      difficulty: "beginner",
      quiz_id: "WAT-boiling-QZ",
      quiz_title: "Boiling water quiz",
      module_id: "WAT-boiling",
      attempts: 20,
      correct: 7,
      accuracy: 35,
      users: 12,
    },
  ],
  weakest_knowledge_items: [
    {
      knowledge_db_id: 3,
      knowledge_id: "KI-WAT-003",
      title: "Pathogen inactivation by heat",
      category: "water",
      difficulty: "beginner",
      attempts: 15,
      correct: 5,
      accuracy: 33.33,
      users: 9,
    },
  ],
  notes: {
    attribution: "A question mapped to N objectives contributes to all N.",
    min_sample: "Rows with fewer than min_sample answers in range are excluded.",
    score_scale: "Accuracy is a 0-100 percentage.",
  },
} satisfies AdminKnowledgeGapsResponse;

export const adminStalledUsers = {
  thresholds: {
    min_days_stalled: 14,
    min_account_age_days: 7,
    definition:
      "A user is stalled when they activated, their last learning activity is older than the threshold, and their account is older than 7 days.",
    activity_source: "Most recent learning activity, from daily_usage.",
    not_measurable:
      "A user who registered and never learned at all is NOT stalled — they never activated.",
  },
  users: [
    {
      user_id: 42,
      display_name: "Dormant Learner",
      email: "dormant@example.com",
      plan: "free",
      subscription_status: null,
      signed_up_at: "2026-01-04T10:00:00Z",
      last_activity_at: "2026-08-12",
      days_stalled: 40,
      lessons_completed: 3,
      quiz_attempts: 1,
      active_days: 4,
      current_module_id: "WAT-boiling",
      current_module_title: "Boiling",
      current_lesson_id: "WAT-boiling-L01",
      current_lesson_title: "Boiling water for purification",
      last_progress_at: "2026-08-12T09:30:00Z",
      unanswered_starts: 2,
      signals: ["opened_lessons_without_completing", "inactive_over_30_days"],
    },
  ],
  pagination: { next_cursor: null, has_more: false, page_size: 25 },
} satisfies AdminStalledUsersResponse;

export const adminRetention = {
  range: RANGE,
  definition: {
    activity: "A user is retained on day N if they were learning-active on exactly day N.",
    day_boundary: "Cohort dates and day boundaries are UTC.",
    observability:
      "A cohort younger than N days reports its window as null, never as zero.",
  },
  cohorts: [
    {
      cohort: "2026-08-24",
      cohort_size: 120,
      max_observable_day: 28,
      d1: { users: 30, rate: 25 },
      d7: { users: 12, rate: 10 },
      d14: { users: 8, rate: 6.67 },
      // Young cohort: D30 is genuinely not observable yet.
      d30: null,
    },
    {
      cohort: "2026-08-17",
      cohort_size: 96,
      max_observable_day: 35,
      d1: { users: 26, rate: 27.08 },
      d7: { users: 11, rate: 11.46 },
      d14: { users: 7, rate: 7.29 },
      d30: { users: 5, rate: 5.21 },
    },
  ],
} satisfies AdminRetentionResponse;

export const adminCommunity = {
  range: RANGE,
  totals: { posts: 14, comments: 52, votes: 88, reports: 2, active_users: 17 },
  unique_authors: { posts: 9, comments: 14, votes: 15 },
  by_plan: [
    { plan: "free", authors: 3, posts: 4, comments: 12 },
    { plan: "survivor", authors: 5, posts: 8, comments: 32 },
    { plan: "operator", authors: 1, posts: 2, comments: 8 },
  ],
  series: [
    { bucket: "2026-09-19", posts: 1, comments: 3, votes: 4 },
    { bucket: "2026-09-20", posts: 2, comments: 5, votes: 7 },
  ],
  notes: {
    votes: "Votes are upvote-only; a row exists while the upvote stands.",
    reports: "Reports are unique per reporter and target.",
  },
} satisfies AdminCommunityResponse;

export const adminGamification = {
  range: RANGE,
  xp: {
    total_awarded: 15_500,
    per_active_user: 298.08,
    series: [
      { bucket: "2026-09-19", xp_awarded: 950, users: 7 },
      { bucket: "2026-09-20", xp_awarded: 1_240, users: 11 },
    ],
  },
  streaks: {
    users_with_active_streak: 12,
    avg_current_streak: 3.4,
    avg_longest_streak: 6.1,
    max_current_streak: 21,
    max_longest_streak: 34,
    distribution: [
      { bucket: "1-2", users: 6 },
      { bucket: "3-6", users: 4 },
      { bucket: "7-13", users: 2 },
    ],
    streak_rows: 63,
  },
  achievements: {
    unlocked_in_range: 41,
    users_with_unlocks: 19,
    definition_count: 12,
    top: [{ achievement_key: "first_lesson", title: "First Steps", unlocks: 14 }],
  },
  notes: {
    xp: "XP awarded, not XP earned once — retries write a fresh transaction.",
    streaks: "Day boundaries in user_streaks are hardcoded UTC.",
    streak_rows: "A streak row is created lazily by any gamification read, so it is not an engagement signal.",
    achievements_empty: null,
  },
} satisfies AdminGamificationResponse;

export const adminBilling = {
  range: RANGE,
  subscriptions: {
    by_plan: [
      { plan: "survivor", users: 34 },
      { plan: "operator", users: 7 },
    ],
    by_status: [
      { status: "active", users: 38 },
      { status: "trialing", users: 3 },
      { status: "canceled", users: 2 },
    ],
    total_rows: 43,
  },
  effective_plans: { paying_users: 41, free_users: 79, trial_users: 3, churned_users: 2 },
  movement: {
    new_subscriptions: 9,
    cancellations: 3,
    trials: 2,
    series: [
      { bucket: "2026-09-19", new_subscriptions: 2, cancellations: 1 },
      { bucket: "2026-09-20", new_subscriptions: 4, cancellations: 0 },
    ],
  },
  revenue: { supported: false, reason: "No monetary amount exists anywhere in this database." },
  upgrades_downgrades: {
    supported: false,
    reason: "subscriptions holds current state only; no plan-change history is recorded.",
  },
  notes: {
    trials: "Subscriptions currently trialing whose period began in range — not trials started.",
    cancellations: "Cancellations recorded in range.",
    plan_source: "by_plan reads subscriptions.plan_code as stored; effective_plans applies the status matrix.",
  },
} satisfies AdminBillingResponse;

export const adminGeography = {
  supported: true,
  range: RANGE,
  totals: { users_with_country: 96, users_without_country: 24, coverage_pct: 80 },
  countries: [
    {
      country: "BR",
      users: 48,
      percentage_of_users: 50,
      active_users: 22,
      paying_users: 19,
      trial_users: 2,
      active_rate: 45.83,
      paying_rate: 39.58,
    },
    {
      country: "US",
      users: 22,
      percentage_of_users: 22.92,
      active_users: 12,
      paying_users: 11,
      trial_users: 1,
      active_rate: 54.55,
      paying_rate: 50,
    },
  ],
  notes: {
    reliability: "Country reflects what the user declared, not where they connected from.",
    not_tracked: "users.country is nullable and not required at signup.",
  },
} satisfies AdminGeographyResponse;

/** Convenience map for tests that need a specific section's payload. */
export const adminAnalyticsFixtures: AdminAnalyticsResponseMap = {
  overview: adminOverview,
  users: adminUsers,
  engagement: adminEngagement,
  learning: adminLearning,
  content: adminContent,
  knowledgeGaps: adminKnowledgeGaps,
  stalledUsers: adminStalledUsers,
  retention: adminRetention,
  community: adminCommunity,
  gamification: adminGamification,
  billing: adminBilling,
  geography: adminGeography,
};

// ── Handlers ───────────────────────────────────────────────────────────────

export const adminAnalyticsHandlers = [
  /**
   * Capability probe + geography data share a path. The probe's URL is
   * reserved (`limit=1`; the Geography section's own control offers
   * 10/25/50/100), so this single handler answers both: 403 to the probe
   * — the default non-admin session every other test runs as — and data
   * to the section. Admin tests override this one handler.
   */
  http.get(`${API}/admin/analytics/geography`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("limit") === "1") {
      return HttpResponse.json(
        errorEnvelope("FORBIDDEN", "Admin access required"),
        { status: 403 },
      );
    }
    return HttpResponse.json(adminGeography);
  }),

  http.get(`${API}/admin/analytics/overview`, () => HttpResponse.json(adminOverview)),
  http.get(`${API}/admin/analytics/users`, () => HttpResponse.json(adminUsers)),
  http.get(`${API}/admin/analytics/engagement`, () => HttpResponse.json(adminEngagement)),
  http.get(`${API}/admin/analytics/learning`, () => HttpResponse.json(adminLearning)),
  http.get(`${API}/admin/analytics/content`, () => HttpResponse.json(adminContent)),
  http.get(`${API}/admin/analytics/knowledge-gaps`, () =>
    HttpResponse.json(adminKnowledgeGaps),
  ),
  http.get(`${API}/admin/analytics/stalled-users`, () => HttpResponse.json(adminStalledUsers)),
  http.get(`${API}/admin/analytics/retention`, () => HttpResponse.json(adminRetention)),
  http.get(`${API}/admin/analytics/community`, () => HttpResponse.json(adminCommunity)),
  http.get(`${API}/admin/analytics/gamification`, () => HttpResponse.json(adminGamification)),
  http.get(`${API}/admin/analytics/billing`, () => HttpResponse.json(adminBilling)),
];

/**
 * Path tests override to promote the session to admin. Also answers the
 * capability probe, which shares this path — see the handler comment
 * above. `ADMIN_PROBE_PATH` is imported above so the probe URL and this
 * module cannot drift apart.
 */
export const ADMIN_GEOGRAPHY_URL = `${API}${ADMIN_PROBE_PATH.split("?")[0] ?? ""}`;
