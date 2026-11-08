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

    if (request.method() === "POST" && path === "/api/v1/quizzes/WAT-storage-Q01/attempts") {
      return json({ attempt_id: 501, quiz_id: "WAT-storage-Q01", status: "in_progress", started_at: "2026-11-07T12:00:00Z", replayed: false });
    }
    if (request.method() === "POST" && path.endsWith("/attempts/501/answers")) {
      return json({ attempt_id: 501, status: "completed", score: 100, total_questions: 3, correct_count: 3, passed: true, passing_score: .7, xp_earned: 50, completed_at: "2026-11-07T12:05:00Z", lo_performance: [], results: [1, 2, 3].map((n) => ({ question_id: `storage-${n}`, user_answer: "A", correct_answer: "A", is_correct: true, explanation: "Store drinking water in clean, sealed, food-grade containers." })) });
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
      case "/api/v1/quizzes/WAT-storage-Q01":
        return json({ quiz_id: "WAT-storage-Q01", module_id: "WAT-storage", title: "Water Storage Quiz", question_count: 3, passing_score: .7, previous_attempts: [], questions: [
          { question_id: "storage-1", question_type: "multiple_choice", question_text: "You are preparing a 72-hour emergency kit. What is the safest way to store your drinking water?", difficulty: "beginner", options: [{ label: "A", text: "In clean, sealed, food-grade containers" }, { label: "B", text: "In any container that looks clean" }, { label: "C", text: "In open buckets near a window" }, { label: "D", text: "In containers previously used for fuel" }] },
          { question_id: "storage-2", question_type: "multiple_choice", question_text: "Where should you keep your emergency water supply?", difficulty: "beginner", options: [{ label: "A", text: "In a cool, dark place" }, { label: "B", text: "In direct sunlight" }] },
          { question_id: "storage-3", question_type: "multiple_choice", question_text: "What should you check when rotating your water supply?", difficulty: "beginner", options: [{ label: "A", text: "The date, seal, and condition of the container" }, { label: "B", text: "Only the color of the container" }] },
        ] });
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
      page.getByRole("heading", { name: /Emergency Water Storage/ }).filter({ visible: true }),
    ).toBeVisible();

    const takeLesson = page.getByRole("link", { name: /take lesson|start mission/i }).filter({ visible: true });
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
    const takeLesson = page.getByRole("link", { name: /start mission/i });
    await expect(takeLesson).toBeVisible();
    await expect(takeLesson).toBeInViewport();
    await page.screenshot({ path: "visual-review/mobile-redesign/home.png", animations: "disabled" });

    await takeLesson.click();
    await expect(page).toHaveURL(/\/modules\/WAT-storage\/lesson$/);
    // The completion action is on the page, not behind a module hop.
    await expect(page.getByRole("button", { name: /complete lesson/i })).toBeVisible();
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.screenshot({ path: "visual-review/mobile-redesign/lesson.png" });
  });

  test("lesson opens the first question directly, with one attempt and recoverable answers", async ({ page }) => {
    mockFlow(page);
    let attempts = 0;
    page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/quizzes/WAT-storage-Q01/attempts")) attempts++; });
    await page.goto("/modules/WAT-storage/lesson");
    await page.getByRole("button", { name: /complete lesson/i }).click();
    await page.getByRole("link", { name: /take field test/i }).click();
    await expect(page.getByRole("radiogroup", { name: "Question 1", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /start field test/i })).toHaveCount(0);
    expect(attempts).toBe(1);
    const narrow = (page.viewportSize()?.width ?? 0) < 1024;
    if (narrow) await expect(page.getByRole("navigation", { name: "Primary mobile" })).not.toBeVisible();
    await page.getByText("In clean, sealed, food-grade containers", { exact: true }).click();
    await page.screenshot({ path: `visual-review/mobile-redesign/quiz-${narrow ? "mobile" : "desktop"}.png` });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("radiogroup", { name: "Question 2", exact: true })).toBeVisible();
    // Wait for observable persistence, rather than racing the draft debounce.
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => {
      if (!key.startsWith("quiz-draft:")) return false;
      const draft = JSON.parse(localStorage.getItem(key) ?? "null") as { answers?: Record<string, string>; currentQuestionIndex?: number } | null;
      return draft?.answers?.["storage-1"] === "A" && draft.currentQuestionIndex === 1;
    }))).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    expect(attempts).toBe(1);
    await page.getByText("In a cool, dark place", { exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByText("The date, seal, and condition of the container", { exact: true }).click();
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expect(page.getByText("Field test complete", { exact: true })).toBeVisible();
    await page.screenshot({ path: `visual-review/mobile-redesign/result-${narrow ? "mobile" : "desktop"}.png`, animations: "disabled" });
    await expect(page.getByRole("link", { name: /continue expedition/i })).toHaveAttribute("href", "/dashboard");
    await page.getByRole("link", { name: /continue expedition/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goBack();
    await page.reload();
    await expect(page.getByRole("button", { name: /start field test/i })).toBeVisible();
    expect(attempts).toBe(1);
  });

  for (const width of [320, 390, 430]) {
    test(`mobile ${width}px: path and quiz fit, with reachable answer actions`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      mockFlow(page);
      await page.goto("/dashboard");
      await expect(page.getByRole("link", { name: "Start mission", exact: true })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      await page.getByRole("link", { name: "Start mission", exact: true }).click();
      await page.getByRole("button", { name: /complete lesson/i }).click();
      await page.getByRole("link", { name: /take field test/i }).click();
      await expect(page.getByRole("radiogroup", { name: "Question 1", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      const lastAnswer = page.getByText("In containers previously used for fuel", { exact: true });
      await lastAnswer.click();
      await expect(page.getByRole("radio", { name: /previously used for fuel/i })).toBeChecked();
      const next = page.getByRole("button", { name: "Next", exact: true });
      await expect(next).toBeInViewport();
      await next.click();
      await expect(page.getByRole("heading", { name: "Where should you keep your emergency water supply?" })).toBeFocused();
    });
  }
});
