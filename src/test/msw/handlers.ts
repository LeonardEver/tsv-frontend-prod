/**
 * MSW handlers — representative backend mock at the NETWORK boundary.
 *
 * Fixtures are typed against the GENERATED OpenAPI response types
 * (`satisfies` checks validate the contract at compile time). Shapes
 * mirror the real backend; handlers encode NO business rules.
 */
import { http, HttpResponse } from "msw";
import type {
  AchievementsResponse,
  AttemptCreateResponse,
  CategoryDetailResponse,
  CategoryListResponse,
  CommunityCategoriesResponse,
  CommunityCommentsResponse,
  CommunityPostResponse,
  CommunityPostsResponse,
  GamificationSummaryResponse,
  LessonResponse,
  ModuleDetailResponse,
  ModuleListResponse,
  ModuleProgressResponse,
  PlansResponse,
  ProfileResponse,
  ProgressResponse,
  QuizResponse,
  QuizSubmissionResponse,
  ResourceResponse,
  SubscriptionResponse,
  UsageResponse,
} from "@/lib/api/types";

const API = "*/api/v1";

function errorEnvelope(code: string, message: string, requestId = "test-req-1") {
  return { error: { code, message, request_id: requestId } };
}

export const testUser = {
  user_id: 1,
  email: "learner@example.com",
  display_name: "Test Learner",
  created_at: "2026-08-01T12:00:00Z",
};

/** New-user progress: nothing started. */
export const emptyProgress = {
  modules_completed: 0,
  total_modules: 9,
  total_xp: 0,
  level: 1,
  current_streak: 0,
  longest_streak: 0,
  recent_activity: [],
} satisfies ProgressResponse;

/** Returning-user progress: one lesson done, one quiz passed. */
export const activeProgress = {
  modules_completed: 1,
  total_modules: 9,
  total_xp: 125,
  level: 1,
  current_streak: 2,
  longest_streak: 2,
  recent_activity: [
    { module_id: "WAT-boiling", action: "quiz_completed", score: 100, at: "2026-08-10T12:00:00Z" },
    { module_id: "WAT-boiling", action: "lesson_completed", score: null, at: "2026-08-09T12:00:00Z" },
  ],
} satisfies ProgressResponse;

export const gamificationSummary = {
  total_xp: 125,
  level: 1,
  level_title: "Novice",
  xp_to_next_level: 175,
  current_streak: 2,
  longest_streak: 2,
  achievements_earned: 1,
  recent_transactions: [
    { amount: 75, source: "quiz_passed", at: "2026-08-10T12:00:00Z" },
    { amount: 50, source: "lesson_completed", at: "2026-08-09T12:00:00Z" },
  ],
} satisfies GamificationSummaryResponse;

export const categoriesFixture = {
  categories: [
    { slug: "water", code: "WAT", title: "Water", module_count: 7, completed_count: 1 },
    { slug: "fire", code: "FIR", title: "Fire", module_count: 2, completed_count: 0 },
  ],
} satisfies CategoryListResponse;

export const waterCategoryDetail = {
  slug: "water",
  code: "WAT",
  title: "Water",
  subcategories: [
    {
      slug: "purification",
      modules: [
        {
          module_id: "WAT-boiling",
          title: "Boiling Water for Purification",
          difficulty: "beginner",
          estimated_duration: 20,
          completed: false,
          progress_pct: 0,
        },
        {
          module_id: "WAT-filtration",
          title: "Water Filtration",
          difficulty: "intermediate",
          estimated_duration: 25,
          completed: true,
          progress_pct: 100,
        },
      ],
    },
    {
      slug: "storage",
      modules: [
        {
          module_id: "WAT-storage",
          title: "Emergency Water Storage",
          difficulty: "beginner",
          estimated_duration: 15,
          completed: false,
          progress_pct: 0,
        },
      ],
    },
  ],
} satisfies CategoryDetailResponse;

export const modulesListFixture = {
  modules: [
    {
      module_id: "WAT-boiling",
      title: "Boiling Water for Purification",
      category: "water",
      difficulty: "beginner",
      estimated_duration: 20,
      description: "The most reliable single purification method.",
      completed: false,
      // AUTHORITY FIXTURE: progress_pct deliberately disagrees with any
      // naive frontend calculation (2 of 4 lessons would be 50%). The UI
      // must render 73 verbatim.
      progress_pct: 73,
    },
    {
      module_id: "WAT-filtration",
      title: "Water Filtration",
      category: "water",
      difficulty: "intermediate",
      estimated_duration: 25,
      description: "Filtering methods and their limits.",
      completed: true,
      progress_pct: 100,
    },
  ],
  pagination: { next_cursor: null, has_more: false, page_size: 20 },
} satisfies ModuleListResponse;

export const moduleDetailFixture = {
  module_id: "WAT-boiling",
  title: "Boiling Water for Purification",
  description: "Learn the correct boiling procedure and why it works.",
  category: "water",
  subcategory: "purification",
  difficulty: "beginner",
  estimated_duration: 20,
  content_version: 1,
  knowledge_items: [
    { knowledge_id: "WAT-boiling-K01", title: "Boiling Water for Purification" },
    { knowledge_id: "WAT-boiling-K02", title: "Boiling Times by Altitude" },
  ],
  lesson: {
    lesson_id: "WAT-boiling-L01",
    title: "Boiling Water for Purification",
    estimated_minutes: 15,
    completed: false,
  },
  quiz: {
    quiz_id: "WAT-boiling-Q01",
    title: "Boiling Water Quiz",
    question_count: 4,
    best_score: null,
    attempt_count: 0,
  },
  resources: [
    {
      resource_id: "WAT-boiling-R01",
      title: "Boiling Water Quick Reference",
      resource_type: "checklist",
      file_format: "PDF",
    },
  ],
  progress: {
    lesson_completed: false,
    quiz_best_score: null,
    completed: false,
  },
} satisfies ModuleDetailResponse;

/** Structured lesson fixture — mirrors the backend's sections payload. */
export const lessonFixture = {
  lesson_id: "WAT-boiling-L01",
  module_id: "WAT-boiling",
  title: "Boiling Water for Purification",
  estimated_minutes: 15,
  content_version: 1,
  sections: [
    {
      type: "learning_objectives",
      heading: "Learning Objectives",
      content: "",
      items: [
        { lo_label: "LO1", lo_global_id: "WAT-boiling-L01-LO1", description: "Explain why boiling works" },
        { lo_label: "LO2", lo_global_id: "WAT-boiling-L01-LO2", description: "Describe the correct procedure" },
      ],
    },
    {
      type: "introduction",
      heading: "Introduction",
      content: "If you could carry only one water purification method, boiling would be it.",
    },
    {
      type: "section",
      heading: "The Correct Procedure",
      content: "## Steps\n\n1. Pre-filter cloudy water\n2. Bring to a rolling boil\n\n| Altitude | Time |\n| --- | --- |\n| Sea level | 1 min |",
    },
    {
      type: "practical_application",
      heading: "Practical Application",
      content: "You're at 2,500m. How long do you boil?",
    },
    {
      type: "recap",
      heading: "Recap",
      content: "Boiling kills all biological pathogens.",
    },
  ],
  progress: { completed: false, last_position: null },
} satisfies LessonResponse;

/** Generated resource WITH an artifact in storage — the server verdict
 * (artifact_available) is true; the frontend never computes it. */
export const resourceDetailFixture = {
  resource_id: "WAT-boiling-R01",
  title: "Boiling Water Quick Reference",
  resource_type: "checklist",
  resource_origin: "generated",
  file_format: "PDF",
  source_url: null,
  license: null,
  redistribution: null,
  module_id: "WAT-boiling",
  module_title: "Boiling Water for Purification",
  artifact_available: true,
} satisfies ResourceResponse;

/** Generated resource WITHOUT an artifact — the honest unavailable
 * state; the frontend must not show Open/Download actions. */
export const resourceDetailNoArtifactFixture = {
  resource_id: "WAT-filtration-R01",
  title: "Water Filtration Quick Reference",
  resource_type: "checklist",
  resource_origin: "generated",
  file_format: "PDF",
  source_url: null,
  license: null,
  redistribution: null,
  module_id: "WAT-filtration",
  module_title: "Water Filtration",
  artifact_available: false,
} satisfies ResourceResponse;

/** External resource — attribution state only, never downloadable. */
export const externalResourceFixture = {
  resource_id: "FIR-safety-R01",
  title: "Fire Safety Quick Reference",
  resource_type: "checklist",
  resource_origin: "external",
  file_format: "PDF",
  source_url: "https://example.com/fire-safety.pdf",
  license: "CC BY 4.0",
  redistribution: "allowed",
  module_id: "FIR-safety",
  module_title: "Fire Safety",
  artifact_available: false,
} satisfies ResourceResponse;

/** Safe quiz payload — questions carry NO correct answers/explanations
 * (the schema enforces this; the fixture proves it). */
export const quizFixture = {
  quiz_id: "WAT-boiling-Q01",
  module_id: "WAT-boiling",
  title: "Boiling Water Quiz",
  question_count: 3,
  passing_score: 0.7,
  questions: [
    {
      question_id: "q01",
      question_type: "multiple_choice",
      question_text: "Why is boiling reliable?",
      options: [
        { label: "A", text: "Fastest" },
        { label: "B", text: "Tastes better" },
        { label: "C", text: "Kills all pathogens" },
        { label: "D", text: "Removes chemicals" },
      ],
      difficulty: "beginner",
    },
    {
      question_id: "q02",
      question_type: "multiple_choice",
      question_text: "How long at sea level?",
      options: [
        { label: "A", text: "30 sec" },
        { label: "B", text: "1 minute" },
        { label: "C", text: "5 minutes" },
        { label: "D", text: "10 minutes" },
      ],
      difficulty: "beginner",
    },
    {
      question_id: "q03",
      question_type: "multiple_choice",
      question_text: "What does boiling NOT remove?",
      options: [
        { label: "A", text: "Bacteria" },
        { label: "B", text: "Viruses" },
        { label: "C", text: "Protozoa" },
        { label: "D", text: "Lead" },
      ],
      difficulty: "beginner",
    },
  ],
  previous_attempts: [],
} satisfies QuizResponse;

/** Authoritative submission result (server-only correctness data). */
export const submissionResultFixture = {
  attempt_id: 1,
  status: "completed",
  score: 66.67,
  total_questions: 3,
  correct_count: 2,
  passed: false,
  passing_score: 0.7,
  results: [
    { question_id: "q01", user_answer: "C", correct_answer: "C", is_correct: true, explanation: "Boiling kills all biological pathogens." },
    { question_id: "q02", user_answer: "B", correct_answer: "B", is_correct: true, explanation: "One minute at a rolling boil at sea level." },
    { question_id: "q03", user_answer: "A", correct_answer: "D", is_correct: false, explanation: "Boiling does not remove heavy metals like lead." },
  ],
  lo_performance: [
    { lo_label: "LO1", lo_global_id: "WAT-boiling-L01-LO1", correct: 2, total: 3, pct: 67 },
  ],
  xp_earned: 25,
  completed_at: "2026-08-12T12:05:00Z",
} satisfies QuizSubmissionResponse;

// Persistent attempt state for the quiz lifecycle mock.
let attemptSeq = 0;
const keyedAttempts = new Map<string, number>();
const submittedAttempts = new Set<number>();

/** Test seam: mark an attempt as already graded (simulates the
 * lost-response case where the server did grade but the client never
 * learned). The next submission for it gets 409, like the backend. */
export function __markAttemptSubmitted(attemptId: number): void {
  submittedAttempts.add(attemptId);
}

/** Test seam: the id of the most recently created attempt — for tests
 * that must reference the attempt without scraping it from the UI
 * (attempt ids are implementation identifiers, never user-facing). */
export function __lastAttemptId(): number {
  return attemptSeq;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 21 mock state — plans / subscription / usage / profile / community.
// The DEFAULT plan is survivor so the pre-existing learning-surface tests
// keep their original behavior (quiz gate open, community open, download
// available). Tests that exercise Free-tier states call __setTestPlan.
// ═══════════════════════════════════════════════════════════════════════════

const PLAN_NAMES = { free: "Free", survivor: "Survivor", operator: "Operator" } as const;
type MockPlanCode = keyof typeof PLAN_NAMES;

const PLANS = [
  {
    code: "free",
    name: "Free",
    price: 0,
    currency: "usd",
    billing_period: null,
    entitlements: {
      daily_lessons: 1,
      daily_quizzes: 1,
      resource_download: false,
      quiz_before_lesson: false,
      community: false,
    },
  },
  {
    code: "survivor",
    name: "Survivor",
    price: 9.9,
    currency: "usd",
    billing_period: "month",
    entitlements: {
      daily_lessons: 10,
      daily_quizzes: 10,
      resource_download: true,
      quiz_before_lesson: true,
      community: true,
    },
  },
  {
    code: "operator",
    name: "Operator",
    price: 19.9,
    currency: "usd",
    billing_period: "month",
    entitlements: {
      daily_lessons: null,
      daily_quizzes: null,
      resource_download: true,
      quiz_before_lesson: true,
      community: true,
    },
  },
] satisfies PlansResponse["plans"];

let currentPlanCode: MockPlanCode = "survivor";

/** Test seam: switch the mocked plan (free | survivor | operator). */
export function __setTestPlan(code: MockPlanCode): void {
  currentPlanCode = code;
}

function planFor(code: MockPlanCode): PlansResponse["plans"][number] {
  const plan = PLANS.find((p) => p.code === code);
  if (!plan) throw new Error("mock invariant: unknown plan");
  return plan;
}

function subscriptionFor(code: MockPlanCode): SubscriptionResponse {
  const plan = planFor(code);
  return {
    plan_code: plan.code,
    plan_name: plan.name,
    price: plan.price,
    currency: plan.currency,
    billing_period: plan.billing_period,
    status: "active",
    started_at: "2026-08-01T12:00:00Z",
    current_period_started_at: "2026-08-01T12:00:00Z",
    renews_at: null,
    ends_at: null,
    canceled_at: null,
    cancel_at_period_end: false,
    provider: null,
    entitlements: plan.entitlements,
  };
}

const communityCategoriesFixture = {
  categories: [
    { code: "general", name: "General" },
    { code: "water", name: "Water" },
    { code: "fire", name: "Fire" },
    { code: "shelter", name: "Shelter" },
    { code: "food", name: "Food" },
    { code: "questions", name: "Questions" },
  ],
} satisfies CommunityCategoriesResponse;

const baseProfile = {
  username: null,
  full_name: "Test Learner",
  display_name: "Test Learner",
  email: "learner@example.com",
  bio: null,
  country: null,
  timezone: null,
  preferred_language: "en",
  experience_level: null,
  reminder_preference: "off",
  learning_goals: null,
  profile_visibility: "community",
  avatar_visibility: "community",
  community_display_name: null,
  member_since: "2026-08-01T12:00:00Z",
  plan_code: "survivor",
  plan_name: "Survivor",
};

let currentProfile = { ...baseProfile } as ProfileResponse;

/** Test seam: reset the profile fixture to the defaults. */
export function __resetTestProfile(): void {
  currentProfile = { ...baseProfile, plan_code: currentPlanCode, plan_name: PLAN_NAMES[currentPlanCode] };
}

type MockComment = CommunityCommentsResponse["comments"][number];
type MockPost = CommunityPostResponse;

let communityPosts: MockPost[] = [];
let communityComments: MockComment[] = [];
let communityPostSeq = 0;
let communityCommentSeq = 0;

const testAuthor = {
  display_name: "Test Learner",
  bio: null,
  member_since: "2026-08-01T12:00:00Z",
  avatar_visible: true,
};

function toListPost(post: MockPost): CommunityPostsResponse["posts"][number] {
  const { body, ...rest } = post;
  void body;
  return { ...rest, body_excerpt: post.body.slice(0, 120) };
}

function addCommunityPost(body: {
  category_code?: string;
  title?: string;
  body?: string;
}): MockPost {
  communityPostSeq += 1;
  const post: MockPost = {
    post_id: communityPostSeq,
    category_code: body.category_code ?? "general",
    category_name:
      communityCategoriesFixture.categories.find((c) => c.code === body.category_code)?.name ??
      "General",
    title: body.title ?? "",
    body: body.body ?? "",
    author: { ...testAuthor },
    vote_score: 0,
    comment_count: 0,
    created_at: "2026-08-12T12:00:00Z",
    updated_at: "2026-08-12T12:00:00Z",
    voted_by_me: false,
    mine: true,
  };
  communityPosts.unshift(post);
  return post;
}

function addCommunityComment(postId: number, body: string): MockComment {
  communityCommentSeq += 1;
  const comment: MockComment = {
    comment_id: communityCommentSeq,
    post_id: postId,
    body,
    author: { ...testAuthor },
    vote_score: 0,
    created_at: "2026-08-12T12:05:00Z",
    updated_at: "2026-08-12T12:05:00Z",
    voted_by_me: false,
    mine: true,
  };
  communityComments.push(comment);
  return comment;
}

/** Test seam: seed a community post (list + detail flows need one). */
export function __seedCommunityPost(partial?: {
  category_code?: string;
  title?: string;
  body?: string;
  mine?: boolean;
}): MockPost {
  const post = addCommunityPost({
    category_code: partial?.category_code ?? "water",
    title: partial?.title ?? "Boiling at altitude",
    body: partial?.body ?? "Does boiling time change above 2,000m?",
  });
  if (partial?.mine === false) post.mine = false;
  return post;
}

/** Test seam: clear all community posts and comments. */
export function __resetCommunity(): void {
  communityPosts = [];
  communityComments = [];
  communityPostSeq = 0;
  communityCommentSeq = 0;
}

export const handlers = [
  // ── Auth bootstrap ──
  http.get(`${API}/auth/me`, ({ request }) => {
    const cookie = request.headers.get("cookie") ?? "";
    if (!cookie.includes("session_id=")) {
      return HttpResponse.json(errorEnvelope("UNAUTHORIZED", "Authentication required"), { status: 401 });
    }
    return HttpResponse.json(testUser);
  }),

  http.post(`${API}/auth/logout`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // ── Content ──
  http.get(`${API}/categories`, () => HttpResponse.json(categoriesFixture)),

  http.get(`${API}/categories/water`, () => HttpResponse.json(waterCategoryDetail)),
  http.get(`${API}/categories/:categorySlug`, ({ params }) =>
    HttpResponse.json(errorEnvelope("NOT_FOUND", `Category "${String(params.categorySlug)}" not found`), { status: 404 }),
  ),

  http.get(`${API}/modules`, () => HttpResponse.json(modulesListFixture)),

  http.get(`${API}/modules/WAT-boiling`, () => HttpResponse.json(moduleDetailFixture)),
  http.get(`${API}/modules/:moduleId`, ({ params }) =>
    HttpResponse.json(errorEnvelope("NOT_FOUND", `Module "${String(params.moduleId)}" not found`), { status: 404 }),
  ),

  http.get(`${API}/lessons/WAT-boiling-L01`, () => HttpResponse.json(lessonFixture)),
  http.get(`${API}/lessons/:lessonId`, ({ params }) =>
    HttpResponse.json(errorEnvelope("NOT_FOUND", `Lesson "${String(params.lessonId)}" not found`), { status: 404 }),
  ),

  // Idempotent completion (backend upsert semantics).
  http.post(`${API}/lessons/:lessonId/complete`, ({ params }) =>
    HttpResponse.json({
      lesson_id: String(params.lessonId),
      completed: true,
      completed_at: "2026-08-12T12:00:00Z",
    }),
  ),

  http.get(`${API}/quizzes/WAT-boiling-Q01`, () => HttpResponse.json(quizFixture)),
  http.get(`${API}/quizzes/:quizId`, ({ params }) =>
    HttpResponse.json(errorEnvelope("NOT_FOUND", `Quiz "${String(params.quizId)}" not found`), { status: 404 }),
  ),

  // ── Resources (Phase 16) ──
  http.get(`${API}/resources/WAT-boiling-R01`, () => HttpResponse.json(resourceDetailFixture)),
  http.get(`${API}/resources/WAT-filtration-R01`, () => HttpResponse.json(resourceDetailNoArtifactFixture)),
  http.get(`${API}/resources/FIR-safety-R01`, () => HttpResponse.json(externalResourceFixture)),
  http.get(`${API}/resources/:resourceId`, ({ params }) =>
    HttpResponse.json(
      errorEnvelope("NOT_FOUND", `Resource "${String(params.resourceId)}" not found`),
      { status: 404 },
    ),
  ),

  // ── Attempt lifecycle: idempotent creation per Idempotency-Key
  //    (backend G-5 semantics), 409 on duplicate submission, historical
  //    result retrieval. Module-level state persists across handlers'
  //    resetHandlers() (the mock mirrors a persistent backend). ──
  http.post(`${API}/quizzes/:quizId/attempts`, ({ request }) => {
    const key = request.headers.get("idempotency-key") ?? "";
    if (key && keyedAttempts.has(key)) {
      const existing = keyedAttempts.get(key);
      if (existing === undefined) throw new Error("mock invariant");
      return HttpResponse.json(
        {
          attempt_id: existing,
          quiz_id: "WAT-boiling-Q01",
          status: "in_progress",
          started_at: "2026-08-12T12:00:00Z",
          replayed: true,
        } satisfies AttemptCreateResponse,
        { status: 200 },
      );
    }
    attemptSeq += 1;
    const attemptId = attemptSeq;
    if (key) keyedAttempts.set(key, attemptId);
    return HttpResponse.json(
      {
        attempt_id: attemptId,
        quiz_id: "WAT-boiling-Q01",
        status: "in_progress",
        started_at: "2026-08-12T12:00:00Z",
        replayed: false,
      } satisfies AttemptCreateResponse,
      { status: 201 },
    );
  }),

  http.post(`${API}/quizzes/:quizId/attempts/:attemptId/answers`, ({ params }) => {
    const attemptId = Number(params.attemptId);
    if (submittedAttempts.has(attemptId)) {
      return HttpResponse.json(
        errorEnvelope("CONFLICT", `Attempt ${attemptId} is already completed`),
        { status: 409 },
      );
    }
    submittedAttempts.add(attemptId);
    return HttpResponse.json({ ...submissionResultFixture, attempt_id: attemptId });
  }),

  http.get(`${API}/quizzes/:quizId/attempts/:attemptId`, ({ params }) => {
    const attemptId = Number(params.attemptId);
    if (!submittedAttempts.has(attemptId)) {
      return HttpResponse.json(
        errorEnvelope("NOT_FOUND", `Attempt ${attemptId} not found`),
        { status: 404 },
      );
    }
    return HttpResponse.json({ ...submissionResultFixture, attempt_id: attemptId });
  }),

  http.get(`${API}/quizzes/:quizId/attempts`, () =>
    HttpResponse.json({
      quiz_id: "WAT-boiling-Q01",
      attempts: [
        { attempt_id: 1, score: 66.67, passed: false, content_version: 1, completed_at: "2026-08-12T12:05:00Z" },
      ],
    }),
  ),

  // ── Progress + gamification ──
  http.get(`${API}/progress`, () => HttpResponse.json(activeProgress)),
  http.get(`${API}/gamification`, () => HttpResponse.json(gamificationSummary)),

  // Per-module progress. NOTE the deliberate disagreement: the module
  // list fixture reports progress_pct 73 even though the naive
  // "completed/total" story would say 50 — the UI must render 73.
  http.get(`${API}/progress/modules/WAT-boiling`, () =>
    HttpResponse.json({
      module_id: "WAT-boiling",
      lesson_completed: false,
      lesson_completed_at: null,
      quiz_attempts: 2,
      quiz_best_score: 85,
      quiz_last_passed: true,
      lo_performance: [
        { lo_label: "LO1", lo_global_id: "WAT-boiling-L01-LO1", pct: 85 },
        { lo_label: "LO2", lo_global_id: "WAT-boiling-L01-LO2", pct: 60 },
      ],
    } satisfies ModuleProgressResponse),
  ),
  http.get(`${API}/progress/modules/WAT-filtration`, () =>
    HttpResponse.json({
      module_id: "WAT-filtration",
      lesson_completed: true,
      lesson_completed_at: "2026-08-09T12:00:00Z",
      quiz_attempts: 1,
      quiz_best_score: 100,
      quiz_last_passed: true,
      lo_performance: [],
    } satisfies ModuleProgressResponse),
  ),
  http.get(`${API}/progress/modules/:moduleId`, ({ params }) =>
    HttpResponse.json({
      module_id: String(params.moduleId),
      lesson_completed: false,
      lesson_completed_at: null,
      quiz_attempts: 0,
      quiz_best_score: null,
      quiz_last_passed: null,
      lo_performance: [],
    } satisfies ModuleProgressResponse),
  ),

  http.get(`${API}/gamification/xp`, () =>
    HttpResponse.json({
      total_xp: 125,
      level: 1,
      level_title: "Novice",
      xp_to_next_level: 175,
      recent_transactions: [
        { amount: 75, source: "quiz_passed", at: "2026-08-10T12:00:00Z" },
      ],
    }),
  ),
  http.get(`${API}/gamification/streak`, () =>
    HttpResponse.json({
      current_streak: 2,
      longest_streak: 2,
      last_activity_date: "2026-08-10",
    }),
  ),
  http.get(`${API}/gamification/achievements`, () =>
    HttpResponse.json({
      earned: [
        {
          achievement_key: "first_water_module",
          title: "First Water Module",
          description: "Complete your first Water category module",
          icon: "💧",
          earned_at: "2026-08-09T12:00:00Z",
        },
      ],
      unearned: [
        {
          achievement_key: "lesson_scholar",
          title: "Lesson Scholar",
          description: "Complete 5 lessons",
          icon: "📖",
          progress: { completed: 1, total: 5, pct: 20 },
        },
        {
          achievement_key: "week_warrior",
          title: "Week Warrior",
          description: "Maintain a 7-day learning streak",
          icon: "📅",
          // Deliberately NO progress — the UI must render "Locked",
          // never a fabricated percentage.
        },
      ],
    } satisfies AchievementsResponse),
  ),

  // ═══════════════════════════════════════════════════════════════
  // Phase 21 — plans, subscription, usage, profile, community
  // ═══════════════════════════════════════════════════════════════
  http.get(`${API}/plans`, () =>
    HttpResponse.json({
      current_plan_code: currentPlanCode,
      plans: PLANS,
    } satisfies PlansResponse),
  ),

  http.get(`${API}/subscription`, () =>
    HttpResponse.json(subscriptionFor(currentPlanCode)),
  ),

  http.post(`${API}/subscription/dev-plan`, async ({ request }) => {
    const body = (await request.json()) as { plan_code?: string };
    if (body.plan_code === "free" || body.plan_code === "survivor" || body.plan_code === "operator") {
      currentPlanCode = body.plan_code;
    }
    return HttpResponse.json(subscriptionFor(currentPlanCode));
  }),

  http.get(`${API}/usage`, () =>
    HttpResponse.json({
      plan_code: currentPlanCode,
      plan_name: PLAN_NAMES[currentPlanCode],
      usage_date: "2026-08-12",
      lesson_completions: 0,
      quiz_attempts: 0,
      limits: {
        daily_lessons: currentPlanCode === "free" ? 1 : currentPlanCode === "survivor" ? 10 : null,
        daily_quizzes: currentPlanCode === "free" ? 1 : currentPlanCode === "survivor" ? 10 : null,
      },
      resets_at: "2026-08-13T00:00:00Z",
    } satisfies UsageResponse),
  ),

  http.get(`${API}/profile`, () => HttpResponse.json(currentProfile)),
  http.patch(`${API}/profile`, async ({ request }) => {
    const patch = (await request.json()) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...currentProfile };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) merged[key] = value;
    }
    Object.assign(currentProfile, merged);
    return HttpResponse.json(currentProfile);
  }),
  http.delete(`${API}/account`, () => HttpResponse.json({ ok: true })),

  // ── Community ──
  http.get(`${API}/community/categories`, () =>
    HttpResponse.json(communityCategoriesFixture),
  ),

  http.get(`${API}/community/posts`, () =>
    HttpResponse.json({
      posts: communityPosts.map(toListPost),
      pagination: { next_cursor: null, has_more: false, page_size: 20 },
    } satisfies CommunityPostsResponse),
  ),

  http.post(`${API}/community/posts`, async ({ request }) => {
    const body = (await request.json()) as { category_code?: string; title?: string; body?: string };
    const post = addCommunityPost(body);
    return HttpResponse.json(post, { status: 201 });
  }),

  http.get(`${API}/community/posts/:postId`, ({ params }) => {
    const post = communityPosts.find((p) => p.post_id === Number(params.postId));
    if (!post) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "Post not found"), { status: 404 });
    }
    return HttpResponse.json(post);
  }),

  http.patch(`${API}/community/posts/:postId`, async ({ request, params }) => {
    const post = communityPosts.find((p) => p.post_id === Number(params.postId));
    if (!post) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "Post not found"), { status: 404 });
    }
    const patch = (await request.json()) as { title?: string; body?: string };
    if (patch.title !== undefined) post.title = patch.title;
    if (patch.body !== undefined) post.body = patch.body;
    post.updated_at = "2026-08-12T13:00:00Z";
    return HttpResponse.json(post);
  }),

  http.delete(`${API}/community/posts/:postId`, ({ params }) => {
    communityPosts = communityPosts.filter((p) => p.post_id !== Number(params.postId));
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API}/community/posts/:postId/vote`, ({ params }) => {
    const postId = Number(params.postId);
    const post = communityPosts.find((p) => p.post_id === postId);
    if (!post) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "post not found"), { status: 404 });
    }
    const voted = !post.voted_by_me;
    post.voted_by_me = voted;
    post.vote_score += voted ? 1 : -1;
    return HttpResponse.json({ voted, vote_score: post.vote_score });
  }),

  http.get(`${API}/community/posts/:postId/comments`, ({ params }) =>
    HttpResponse.json({
      comments: communityComments
        .filter((c) => c.post_id === Number(params.postId))
        .map((c) => ({ ...c })),
      pagination: { next_cursor: null, has_more: false, page_size: 20 },
    } satisfies CommunityCommentsResponse),
  ),

  http.post(`${API}/community/posts/:postId/comments`, async ({ request, params }) => {
    const body = (await request.json()) as { body?: string };
    const postId = Number(params.postId);
    const comment = addCommunityComment(postId, body.body ?? "");
    const post = communityPosts.find((p) => p.post_id === postId);
    if (post) post.comment_count += 1;
    return HttpResponse.json(comment, { status: 201 });
  }),

  http.patch(`${API}/community/comments/:commentId`, async ({ request, params }) => {
    const comment = communityComments.find((c) => c.comment_id === Number(params.commentId));
    if (!comment) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "Comment not found"), { status: 404 });
    }
    const patch = (await request.json()) as { body?: string };
    if (patch.body !== undefined) comment.body = patch.body;
    comment.updated_at = "2026-08-12T13:00:00Z";
    return HttpResponse.json(comment);
  }),

  http.delete(`${API}/community/comments/:commentId`, ({ params }) => {
    const commentId = Number(params.commentId);
    const comment = communityComments.find((c) => c.comment_id === commentId);
    communityComments = communityComments.filter((c) => c.comment_id !== commentId);
    if (comment) {
      const post = communityPosts.find((p) => p.post_id === comment.post_id);
      if (post) post.comment_count = Math.max(0, post.comment_count - 1);
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API}/community/comments/:commentId/vote`, ({ params }) => {
    const comment = communityComments.find((c) => c.comment_id === Number(params.commentId));
    if (!comment) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "comment not found"), { status: 404 });
    }
    const voted = !comment.voted_by_me;
    comment.voted_by_me = voted;
    comment.vote_score += voted ? 1 : -1;
    return HttpResponse.json({ voted, vote_score: comment.vote_score });
  }),

  http.post(`${API}/community/posts/:postId/report`, () => HttpResponse.json({ ok: true })),
  http.post(`${API}/community/comments/:commentId/report`, () => HttpResponse.json({ ok: true })),
];
