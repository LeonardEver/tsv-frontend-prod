/**
 * The simplified learning flow (UX request): Home → Lesson → Quiz.
 *
 * What this covers that the older specs do not:
 *   - the Base Camp recommendation walks PAST completed missions and links
 *     straight into the next unfinished lesson (never the module page);
 *   - the lesson page's field-test CTA is disabled and non-clickable while
 *     the Free-plan gate is closed, and becomes a working link the moment
 *     the backend reports the lesson completed.
 *
 * API mocked at the network boundary. The mock carries real entitlement and
 * progress shapes because the gate reads both.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

const USER = {
  user_id: 1,
  email: "learner@example.com",
  display_name: "Learner",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

const CATEGORIES = {
  categories: [
    { slug: "water", code: "WAT", title: "Water", module_count: 3, completed_count: 2 },
  ],
};

/** Server order: the first two missions are finished, the third is not. */
const MODULES = [
  {
    module_id: "WAT-boiling",
    title: "Boiling Water for Purification",
    category: "water",
    difficulty: "beginner",
    estimated_duration: 20,
    description: "The most reliable single purification method.",
    completed: true,
    progress_pct: 100,
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
  {
    module_id: "WAT-storage",
    title: "Emergency Water Storage",
    category: "water",
    difficulty: "beginner",
    estimated_duration: 15,
    description: "Keep a reserve that lasts.",
    completed: false,
    progress_pct: 0,
  },
];

/** Free plan: the field test waits for the lesson. */
const SUBSCRIPTION_FREE = {
  plan_code: "free",
  plan_name: "Free",
  status: "active",
  current_period_end: null,
  cancel_at_period_end: false,
  entitlements: {
    daily_lessons: 1,
    daily_quizzes: 1,
    resource_download: false,
    quiz_before_lesson: false,
    community: false,
  },
};

function mockFlow(page: Page): void {
  let lessonCompleted = false;

  void page.route(API, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    if (request.method() === "POST" && path === "/api/v1/lessons/WAT-storage-L01/complete") {
      lessonCompleted = true;
      return json({
        lesson_id: "WAT-storage-L01",
        completed: true,
        completed_at: "2026-09-22T12:00:00Z",
      });
    }

    switch (path) {
      case "/api/v1/auth/me":
        return json(USER);
      case "/api/v1/categories":
        return json(CATEGORIES);
      case "/api/v1/modules":
        return json({
          modules: MODULES,
          pagination: { next_cursor: null, has_more: false, page_size: 3 },
        });
      case "/api/v1/progress":
        return json({
          modules_completed: 2,
          total_modules: 3,
          total_xp: 250,
          level: 1,
          current_streak: 2,
          longest_streak: 2,
          recent_activity: [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 250,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 50,
          current_streak: 2,
          longest_streak: 2,
          achievements_earned: 1,
          recent_transactions: [],
        });
      case "/api/v1/gamification/achievements":
        return json({ earned: [], unearned: [] });
      case "/api/v1/usage":
        return json({
          plan_name: "Free",
          lesson_completions: 0,
          quiz_attempts: 0,
          limits: { daily_lessons: 1, daily_quizzes: 1 },
        });
      case "/api/v1/subscription":
      case "/api/v1/plans/subscription":
        return json(SUBSCRIPTION_FREE);
      case "/api/v1/modules/WAT-storage":
        return json({
          module_id: "WAT-storage",
          title: "Emergency Water Storage",
          description: "Keep a reserve that lasts.",
          category: "water",
          subcategory: "storage",
          difficulty: "beginner",
          estimated_duration: 15,
          content_version: 1,
          knowledge_items: [],
          lesson: {
            lesson_id: "WAT-storage-L01",
            title: "Emergency Water Storage",
            estimated_minutes: 12,
            completed: lessonCompleted,
          },
          quiz: {
            quiz_id: "WAT-storage-Q01",
            title: "Water Storage Quiz",
            question_count: 3,
            best_score: null,
            attempt_count: 0,
          },
          resources: [],
          progress: { lesson_completed: lessonCompleted, quiz_best_score: null, completed: false },
        });
      case "/api/v1/progress/modules/WAT-storage":
        return json({
          module_id: "WAT-storage",
          lesson_completed: lessonCompleted,
          lesson_completed_at: lessonCompleted ? "2026-09-22T12:00:00Z" : null,
          quiz_attempts: 0,
          quiz_best_score: null,
          quiz_last_passed: null,
          lo_performance: [],
        });
      case "/api/v1/lessons/WAT-storage-L01":
        return json({
          lesson_id: "WAT-storage-L01",
          module_id: "WAT-storage",
          title: "Emergency Water Storage",
          estimated_minutes: 12,
          content_version: 1,
          sections: [
            {
              type: "section",
              heading: "Storage that holds",
              content: "Rotate your reserve every six months.",
            },
          ],
          progress: { completed: lessonCompleted, last_position: null },
        });
      default:
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-flow-1" },
          }),
        });
    }
  });
}

test.describe("simplified learning flow", () => {
  test("Home recommends the next unfinished mission and links straight to its lesson", async ({
    page,
  }) => {
    mockFlow(page);
    await page.goto("/dashboard");

    // Two missions are complete; the recommendation is the third, not the
    // first one in the list.
    await expect(
      page.getByRole("heading", { name: "Emergency Water Storage" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toHaveCount(0);

    const takeLesson = page.getByRole("link", { name: /take lesson/i });
    await expect(takeLesson).toHaveAttribute("href", "/modules/WAT-storage/lesson");

    // Home → Lesson in one click. No module page is involved.
    await takeLesson.click();
    await expect(page).toHaveURL(/\/modules\/WAT-storage\/lesson$/);
    await expect(page.getByText(/field manual ·/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Emergency Water Storage" })).toBeVisible();
  });

  test("the module page stays reachable by browsing", async ({ page }) => {
    mockFlow(page);
    // The recommendation bypasses the module page; browse does not.
    await page.goto("/modules/WAT-storage");
    await expect(
      page.getByRole("heading", { name: "Emergency Water Storage" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /start field manual/i })).toBeVisible();
  });

  test("the lesson flow unlocks the field test on completion", async ({ page }) => {
    mockFlow(page);
    await page.goto("/modules/WAT-storage/lesson");

    // Before completion: the CTA is present, disabled and NOT a link, with
    // the reason stated underneath.
    const lockedCta = page.getByRole("button", { name: /take field test/i });
    await expect(lockedCta).toBeVisible();
    await expect(lockedCta).toBeDisabled();
    await expect(page.getByRole("link", { name: /take field test/i })).toHaveCount(0);
    await expect(
      page.getByText(/complete the lesson above to unlock the field test/i),
    ).toBeVisible();

    // Complete the lesson — the authoritative refetch opens the gate.
    await page.getByRole("button", { name: /complete lesson/i }).click();
    await expect(page.getByText("Lesson complete").first()).toBeVisible();

    const openCta = page.getByRole("link", { name: /take field test/i });
    await expect(openCta).toBeVisible();
    await expect(openCta).toHaveAttribute("href", "/modules/WAT-storage/quiz");
    await expect(page.getByRole("button", { name: /take field test/i })).toHaveCount(0);
  });

  test("mobile: the recommended lesson is one tap from Base Camp", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only entry-point check");
    mockFlow(page);

    await page.goto("/dashboard");
    const takeLesson = page.getByRole("link", { name: /take lesson/i });
    await expect(takeLesson).toBeVisible();
    await expect(takeLesson).toBeInViewport();

    await takeLesson.click();
    await expect(page).toHaveURL(/\/modules\/WAT-storage\/lesson$/);
    // The completion action is on the page, not behind a module hop.
    await expect(page.getByRole("button", { name: /complete lesson/i })).toBeVisible();
  });
});
