/**
 * UX journeys (Phase 15.5 §21) — the actual product experience:
 *
 *   UX-01  new user → dashboard discovery → first region → first mission → lesson
 *   UX-02  returning user → dashboard → "Your next mission" → lesson
 *   UX-05  quiz → reward feedback (score, XP, achievement reveal) → updated progress
 *   UX-06  mobile: Base Camp dashboard — mission CTA in viewport, trail, rewards
 *   UX-08  category identity: every published region renders its declared accent, never raw IDs
 *   UX-09  mobile: Learn page — six distinct regions, no horizontal overflow
 *   UX-A11 reduced-motion: the full quiz journey remains behavioral
 *
 * UX-03 (quiz without lesson), UX-04 (lesson completion feedback) and
 * UX-07 (cross-user isolation) stay covered by quiz.spec FLOW 2,
 * lesson.spec and release-journey RJ-2/RJ-3 — no duplication here.
 *
 * API mocked at the network boundary (no real backend, never production).
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

type Mode = "new" | "returning";

const user = {
  user_id: 1,
  email: "learner@example.com",
  display_name: "Test Learner",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

const achievement = {
  achievement_key: "first_water_module",
  title: "First Water Module",
  description: "Complete your first Water category module",
  icon: "💧",
  earned_at: "2026-08-09T12:00:00Z",
};

function mockUxBackend(page: Page, mode: Mode): void {
  // Server-side state the frontend must PROJECT, never derive.
  const state = { submitted: false };

  void page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-ux" } }),
      });

    switch (path) {
      case "/api/v1/auth/me":
        return json(user);
      case "/api/v1/progress":
        return json(
          mode === "new"
            ? {
                modules_completed: 0,
                total_modules: 9,
                total_xp: 0,
                level: 1,
                current_streak: 0,
                longest_streak: 0,
                recent_activity: [],
              }
            : state.submitted
              ? {
                  modules_completed: 1,
                  total_modules: 9,
                  total_xp: 150,
                  level: 1,
                  current_streak: 2,
                  longest_streak: 2,
                  recent_activity: [
                    { module_id: "WAT-boiling", action: "quiz_completed", score: 67, at: "2026-08-12T12:05:00Z" },
                    { module_id: "WAT-boiling", action: "lesson_completed", score: null, at: "2026-08-09T12:00:00Z" },
                  ],
                }
              : {
                  modules_completed: 0,
                  total_modules: 9,
                  total_xp: 125,
                  level: 1,
                  current_streak: 2,
                  longest_streak: 2,
                  recent_activity: [
                    { module_id: "WAT-boiling", action: "quiz_completed", score: 100, at: "2026-08-10T12:00:00Z" },
                  ],
                },
        );
      case "/api/v1/gamification":
        // Consistent with /progress: a new user has no rewards at all.
        return json(
          mode === "new"
            ? {
                total_xp: 0,
                level: 1,
                level_title: "Novice",
                xp_to_next_level: 300,
                current_streak: 0,
                longest_streak: 0,
                achievements_earned: 0,
                recent_transactions: [],
              }
            : {
                total_xp: state.submitted ? 150 : 125,
                level: 1,
                level_title: "Novice",
                xp_to_next_level: 175,
                current_streak: 2,
                longest_streak: 2,
                achievements_earned: state.submitted ? 2 : 1,
                recent_transactions: [],
              },
        );
      case "/api/v1/gamification/achievements":
        // Post-submit the authoritative list contains ONE more earned
        // achievement — the result screen reveals exactly the diff.
        return json({
          earned: mode === "new" ? [] : state.submitted
            ? [
                achievement,
                {
                  achievement_key: "quiz_challenger",
                  title: "Quiz Challenger",
                  description: "Complete a quiz",
                  icon: "🧠",
                  earned_at: "2026-08-12T12:05:00Z",
                },
              ]
            : [achievement],
          unearned: [],
        });
      case "/api/v1/categories":
        return json({
          categories: [
            { slug: "water", code: "WAT", title: "Water", module_count: 7, completed_count: 0 },
            { slug: "fire", code: "FIR", title: "Fire", module_count: 2, completed_count: 0 },
            { slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 2, completed_count: 0 },
            { slug: "shelter", code: "SHE", title: "Shelter", module_count: 1, completed_count: 0 },
            { slug: "food", code: "FOD", title: "Food", module_count: 4, completed_count: 0 },
            { slug: "agriculture", code: "AGR", title: "Agriculture", module_count: 4, completed_count: 0 },
            { slug: "navigation", code: "NAV", title: "Navigation", module_count: 12, completed_count: 0 },
          ],
        });
      case "/api/v1/categories/water":
        return json({
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
              ],
            },
          ],
        });
      case "/api/v1/categories/survival-fundamentals":
        return json({
          slug: "survival-fundamentals",
          code: "SUR",
          title: "Survival Fundamentals",
          subcategories: [
            {
              slug: "preparedness",
              modules: [
                {
                  module_id: "SUR-preparedness",
                  title: "Emergency Preparedness Basics",
                  difficulty: "beginner",
                  estimated_duration: 20,
                  completed: false,
                  progress_pct: 0,
                },
              ],
            },
          ],
        });
      case "/api/v1/categories/shelter":
        return json({
          slug: "shelter",
          code: "SHE",
          title: "Shelter",
          subcategories: [
            {
              slug: "emergency-shelter",
              modules: [
                {
                  module_id: "SHE-tarp-shelters",
                  title: "Tarp Shelters",
                  difficulty: "beginner",
                  estimated_duration: 20,
                  completed: false,
                  progress_pct: 0,
                },
              ],
            },
          ],
        });
      case "/api/v1/categories/food":
        return json({
          slug: "food",
          code: "FOD",
          title: "Food",
          subcategories: [
            {
              slug: "food-storage",
              modules: [
                {
                  module_id: "FOD-food-storage",
                  title: "Food Storage Fundamentals",
                  difficulty: "beginner",
                  estimated_duration: 20,
                  completed: false,
                  progress_pct: 0,
                },
              ],
            },
          ],
        });
      case "/api/v1/categories/agriculture":
        return json({
          slug: "agriculture",
          code: "AGR",
          title: "Agriculture",
          subcategories: [
            {
              slug: "gardening",
              modules: [
                {
                  module_id: "AGR-garden-planning",
                  title: "Garden Planning Fundamentals",
                  difficulty: "beginner",
                  estimated_duration: 20,
                  completed: false,
                  progress_pct: 0,
                },
              ],
            },
          ],
        });
      case "/api/v1/categories/navigation":
        return json({
          slug: "navigation",
          code: "NAV",
          title: "Navigation",
          subcategories: [
            {
              slug: "navigation-basics",
              modules: [
                {
                  module_id: "NAV-navigation-fundamentals",
                  title: "Navigation Fundamentals",
                  difficulty: "beginner",
                  estimated_duration: 20,
                  completed: false,
                  progress_pct: 0,
                },
              ],
            },
          ],
        });
      case "/api/v1/modules":
        return json({
          modules: [
            {
              module_id: "WAT-boiling",
              title: "Boiling Water for Purification",
              category: "water",
              difficulty: "beginner",
              estimated_duration: 20,
              description: "The most reliable single purification method.",
              completed: false,
              progress_pct: 0,
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
          pagination: { next_cursor: null, has_more: false, page_size: 2 },
        });
      case "/api/v1/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          title: "Boiling Water for Purification",
          description: "Learn the correct boiling procedure.",
          category: "water",
          subcategory: "purification",
          difficulty: "beginner",
          estimated_duration: 20,
          content_version: 1,
          knowledge_items: [
            { knowledge_id: "WAT-boiling-K01", title: "Boiling Water for Purification" },
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
            question_count: 3,
            best_score: null,
            attempt_count: 0,
          },
          resources: [],
          progress: { lesson_completed: false, quiz_best_score: null, completed: false },
        });
      case "/api/v1/lessons/WAT-boiling-L01":
        return json({
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
              ],
            },
            { type: "introduction", heading: "Introduction", content: "Boiling is the most reliable single method." },
            { type: "recap", heading: "Recap", content: "Boiling kills all biological pathogens." },
          ],
          progress: { completed: false, last_position: null },
        });
      case "/api/v1/lessons/WAT-boiling-L01/complete":
        return json({ lesson_id: "WAT-boiling-L01", completed: true, completed_at: "2026-08-12T12:00:00Z" });
      case "/api/v1/quizzes/WAT-boiling-Q01":
        return json({
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
        });
      case "/api/v1/quizzes/WAT-boiling-Q01/attempts":
        return route.request().method() === "GET"
          ? json({ quiz_id: "WAT-boiling-Q01", attempts: [] })
          : json(
              {
                attempt_id: 1,
                quiz_id: "WAT-boiling-Q01",
                status: "in_progress",
                started_at: "2026-08-12T12:00:00Z",
                replayed: false,
              },
              201,
            );
      case "/api/v1/quizzes/WAT-boiling-Q01/attempts/1/answers":
        state.submitted = true;
        return json({
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
          lo_performance: [{ lo_label: "LO1", lo_global_id: "WAT-boiling-L01-LO1", correct: 2, total: 3, pct: 67 }],
          xp_earned: 25,
          completed_at: "2026-08-12T12:05:00Z",
        });
      case "/api/v1/progress/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          lesson_completed: false,
          lesson_completed_at: null,
          quiz_attempts: state.submitted ? 1 : 0,
          quiz_best_score: state.submitted ? 67 : null,
          quiz_last_passed: false,
          lo_performance: [],
        });
      default:
        // The progress page fans out per-module progress queries for
        // every module in the inventory.
        if (path.startsWith("/api/v1/progress/modules/")) {
          return json({
            module_id: path.split("/").pop(),
            lesson_completed: false,
            lesson_completed_at: null,
            quiz_attempts: 0,
            quiz_best_score: null,
            quiz_last_passed: null,
            lo_performance: [],
          });
        }
        return notFound();
    }
  });
}

async function answerAll(page: Page): Promise<void> {
  await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 2" }).getByText(/1 minute/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 3" }).getByText(/bacteria/i).click();
}

test.describe("UX journeys", () => {
  test("UX-01 — new user: dashboard discovery → first region → first mission → lesson", async ({ page }) => {
    mockUxBackend(page, "new");

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, test/i })).toBeVisible();

    // Discovery, not fabricated activity: deterministic first region.
    const exploreWater = page.getByRole("link", { name: /explore water/i });
    await expect(exploreWater).toBeVisible();
    await expect(exploreWater).toHaveAttribute("href", "/categories/water");
    await expect(page.getByText(/last:/i)).toHaveCount(0);

    // Honest new-user state: the expedition is empty with a discovery CTA,
    // and the region cards show the whole curriculum as not started.
    await expect(page.getByText("Your expedition starts here")).toBeVisible();
    await expect(page.getByRole("link", { name: /explore regions/i })).toBeVisible();
    await expect(page.getByText("0 complete").first()).toBeVisible();

    // Discovery → region → first mission → lesson. (Each page is gated
    // on a breadcrumb element unique to it — the router commits the URL
    // before React paints the next route, so heading queries alone race
    // the transition.)
    await exploreWater.click();
    await expect(page.getByRole("link", { name: "Regions", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Water", exact: true })).toBeVisible();
    await page.getByRole("link", { name: /boiling water for purification/i }).first().click();
    await expect(page.getByRole("link", { name: "Regions", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification", exact: true })).toBeVisible();
    await page.getByRole("link", { name: /start field manual/i }).click();
    await expect(page.getByText(/field manual ·/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification", exact: true })).toBeVisible();
  });

  test("UX-02 — returning user: next mission card drives the continue action", async ({ page }) => {
    mockUxBackend(page, "returning");

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, test/i })).toBeVisible();

    // The dominant card derives its CTA from authoritative flags
    // (lesson not completed → lesson).
    await expect(page.getByText("Your next mission")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification", exact: true })).toBeVisible();
    const startLesson = page.getByRole("link", { name: /start lesson/i });
    await expect(startLesson).toHaveAttribute("href", "/modules/WAT-boiling/lesson");
    // The recent-activity trail projects the module row the hero derives
    // from — the mission itself stays one click away.
    await expect(page.getByRole("link", { name: /boiling water for purification/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling",
    );

    await startLesson.click();
    await expect(page.getByText(/field manual ·/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification", exact: true })).toBeVisible();
  });

  test("UX-05 — quiz reward feedback: score, XP and achievement reveal, then updated progress", async ({ page }) => {
    mockUxBackend(page, "returning");

    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();

    // Reward moment: server values only, presented as earned.
    await expect(page.getByRole("heading", { name: "Boiling Water Quiz", exact: true })).toBeVisible();
    await expect(page.getByText("Field test complete")).toBeVisible();
    await expect(page.getByText("67%").first()).toBeVisible();
    await expect(page.getByText("25 XP", { exact: true })).toBeVisible();
    await expect(page.getByText("Not passed")).toBeVisible();

    // Achievement reveal: the diff against the pre-submit server list.
    await expect(page.getByRole("heading", { name: /new achievement/i })).toBeVisible();
    await expect(page.getByText("Quiz Challenger")).toBeVisible();
    await expect(page.getByText("First Water Module")).toHaveCount(0);

    // Back to the product: progress reflects the authoritative update.
    await page.goto("/progress");
    await expect(page.getByText("11%")).toBeVisible();
    await expect(page.getByText("Score 67%")).toBeVisible();
  });

  test("UX-06 — mobile: the Base Camp dashboard keeps the mission CTA in view", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only layout assertions");
    mockUxBackend(page, "returning");

    await page.goto("/dashboard");

    // Next mission is immediately visible — no scrolling required.
    const startLesson = page.getByRole("link", { name: /start lesson/i });
    await expect(startLesson).toBeVisible();
    await expect(startLesson).toBeInViewport();

    // The trail and rewards remain reachable below.
    await expect(page.getByRole("heading", { name: /your expedition/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /xp & achievements/i })).toBeVisible();
    await expect(page.getByText("2 day streak")).toBeVisible();
  });

  test("UX-06b — 320px viewport: the Base Camp dashboard never overflows horizontally", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "viewport override conflicts with device emulation");
    await page.setViewportSize({ width: 320, height: 640 });
    mockUxBackend(page, "returning");

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, test/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start lesson/i })).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test("UX-A11 — reduced motion: the full quiz journey remains behavioral", async ({ page }) => {
    mockUxBackend(page, "returning");
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();

    // Result, XP reward and review all render without motion.
    await expect(page.getByRole("heading", { name: "Boiling Water Quiz", exact: true })).toBeVisible();
    await expect(page.getByText("25 XP", { exact: true })).toBeVisible();
    await expect(page.getByText(/boiling does not remove heavy metals/i)).toBeVisible();
  });

  test("UX-08 — category identity: every published region renders its declared accent, never raw IDs", async ({ page }) => {
    mockUxBackend(page, "returning");

    await page.goto("/categories");

    // Real titles for every region — never internal codes as labels.
    // Accent colors are config-driven (lib/category-visuals) and land as
    // inline `var(--cat-<lovable-slug>)` styles on each card.
    const regions = [
      { slug: "water", title: "Water", accent: "var(--cat-water)" },
      { slug: "fire", title: "Fire", accent: "var(--cat-fire)" },
      { slug: "survival-fundamentals", title: "Survival Fundamentals", accent: "var(--cat-fundamentals)" },
      { slug: "shelter", title: "Shelter", accent: "var(--cat-shelter)" },
      { slug: "food", title: "Food", accent: "var(--cat-food)" },
      { slug: "agriculture", title: "Agriculture", accent: "var(--cat-agriculture)" },
      { slug: "navigation", title: "Navigation", accent: "var(--cat-navigation)" },
    ];
    for (const region of regions) {
      // Scope to <main>: the sidebar also links every region.
      const card = page.locator(`#main a[href="/categories/${region.slug}"]`);
      await expect(card).toBeVisible();
      await expect(card.getByText(region.title, { exact: true })).toBeVisible();
      // Each region carries its declared semantic accent.
      const accent = new RegExp(region.accent.replace(/[()]/g, "\\$&"));
      await expect(card).toHaveAttribute("style", accent);
    }

    // No raw internal category codes are ever rendered as labels.
    await expect(page.getByText(/^(WAT|FIR|SUR|SHE|FOD|AGR|NAV)$/)).toHaveCount(0);

    // Category detail carries the region's identity on its mark — the
    // hero title renders in the declared accent, never a raw code.
    await page.goto("/categories/agriculture");
    await expect(page.getByRole("heading", { name: "Agriculture", exact: true })).toBeVisible();
    await expect(page.locator("main h1")).toHaveAttribute(
      "style",
      /var\(--cat-agriculture\)/,
    );
    await expect(page.getByRole("link", { name: /garden planning fundamentals/i })).toBeVisible();

    // The Navigation region carries its own declared identity too.
    await page.goto("/categories/navigation");
    await expect(page.getByRole("heading", { name: "Navigation", exact: true })).toBeVisible();
    await expect(page.locator("main h1")).toHaveAttribute(
      "style",
      /var\(--cat-navigation\)/,
    );
  });

  test("UX-09 — mobile: the Learn page shows seven distinct regions without horizontal overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only layout assertions");
    mockUxBackend(page, "returning");

    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Explore Regions", exact: true })).toBeVisible();

    // All seven region cards are reachable and distinct. Scoped to
    // <main>: the desktop sidebar (hidden on mobile, still in the DOM)
    // duplicates every region title.
    for (const title of ["Water", "Fire", "Survival Fundamentals", "Shelter", "Food", "Agriculture", "Navigation"]) {
      await expect(page.locator("#main").getByText(title, { exact: true })).toBeVisible();
    }

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
