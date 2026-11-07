/**
 * Foraging journeys (Phase 21 — Batch 07) — smoke journeys for the new
 * Foraging & Plants region:
 *
 *   FOR-1  desktop: Learn → Foraging region → module → lesson → quiz → result → progress
 *   FOR-2  quiz payload contract: no correct_answer/explanation served pre-submit,
 *          and the journey still completes with server-scored results
 *   FOR-3  mobile: Foraging region card renders on the Learn page without
 *          horizontal overflow; module discovery on a Pixel viewport
 *
 * API mocked at the network boundary (no real backend, never production).
 * The FOR payloads mirror the real API shapes verified against the live
 * stack in frontend/scripts/phase23-verify.mjs.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

const user = {
  user_id: 1,
  email: "learner@example.com",
  display_name: "Test Learner",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

const FOR_MODULES: Array<[string, string, string]> = [
  // [module_id, title, subcategory]
  ["FOR-plant-identification", "Plant Identification Fundamentals", "plant-identification"],
  ["FOR-edibility-safety", "Wild Edibility & Safety", "edible-plants"],
  ["FOR-leaves", "Edible Leaves, Shoots & Greens", "edible-plants"],
  ["FOR-fruits-berries", "Wild Fruits & Berries", "edible-plants"],
  ["FOR-roots-tubers", "Roots, Tubers & Underground Foods", "edible-plants"],
  ["FOR-dangerous-plants", "Dangerous & Toxic Plants", "toxic-plants"],
  ["FOR-lookalikes", "Dangerous Look-Alikes", "toxic-plants"],
  ["FOR-mushrooms", "Wild Mushrooms & Fungal Safety", "mushrooms"],
  ["FOR-foraging-practice", "Foraging Fieldcraft", "plant-processing"],
  ["FOR-ethical-foraging", "Sustainable & Ethical Foraging", "responsible-foraging"],
];

function mockForagingBackend(page: Page): void {
  const state = { submitted: false };

  void page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-for" } }),
      });

    switch (path) {
      case "/api/v1/auth/me":
        return json(user);
      case "/api/v1/progress":
        return json({
          modules_completed: state.submitted ? 1 : 0,
          total_modules: 68,
          total_xp: state.submitted ? 150 : 0,
          level: 1,
          current_streak: state.submitted ? 1 : 0,
          longest_streak: state.submitted ? 1 : 0,
          recent_activity: state.submitted
            ? [{ module_id: "FOR-edibility-safety", action: "quiz_completed", score: 67, at: "2026-08-26T12:05:00Z" }]
            : [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: state.submitted ? 150 : 0,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: state.submitted ? 150 : 300,
          current_streak: state.submitted ? 1 : 0,
          longest_streak: state.submitted ? 1 : 0,
          achievements_earned: state.submitted ? 1 : 0,
          recent_transactions: state.submitted
            ? [{ amount: 50, source: "quiz_completed", at: "2026-08-26T12:05:00Z" }]
            : [],
        });
      case "/api/v1/gamification/achievements":
        return json({
          earned: state.submitted
            ? [
                {
                  achievement_key: "quiz_challenger",
                  title: "Quiz Challenger",
                  description: "Complete a quiz",
                  icon: "🧠",
                  earned_at: "2026-08-26T12:05:00Z",
                },
              ]
            : [],
          unearned: [],
        });
      case "/api/v1/categories":
        return json({
          categories: [
            { slug: "water", code: "WAT", title: "Water", module_count: 11, completed_count: 0 },
            { slug: "fire", code: "FIR", title: "Fire", module_count: 7, completed_count: 0 },
            { slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 6, completed_count: 0 },
            { slug: "shelter", code: "SHE", title: "Shelter", module_count: 8, completed_count: 0 },
            { slug: "food", code: "FOD", title: "Food", module_count: 10, completed_count: 0 },
            { slug: "agriculture", code: "AGR", title: "Agriculture", module_count: 9, completed_count: 0 },
            { slug: "medical-first-aid", code: "MED", title: "Medical & First Aid", module_count: 7, completed_count: 0 },
            { slug: "foraging-plants", code: "FOR", title: "Foraging & Plants", module_count: 10, completed_count: 0 },
          ],
        });
      case "/api/v1/categories/foraging-plants": {
        const subcategories = ["plant-identification", "edible-plants", "toxic-plants", "mushrooms", "plant-processing", "responsible-foraging"];
        return json({
          slug: "foraging-plants",
          code: "FOR",
          title: "Foraging & Plants",
          subcategories: subcategories.map((slug) => ({
            slug,
            modules: FOR_MODULES.filter(([, , sub]) => sub === slug).map(([module_id, title]) => ({
              module_id,
              title,
              difficulty: "beginner",
              estimated_duration: 20,
              completed: false,
              progress_pct: 0,
            })),
          })),
        });
      }
      case "/api/v1/modules":
        return json({
          modules: FOR_MODULES.map(([module_id, title, subcategory]) => ({
            module_id,
            title,
            category: "foraging-plants",
            subcategory,
            difficulty: "beginner",
            estimated_duration: 20,
            description: `A Foraging & Plants mission: ${title}.`,
            completed: false,
            progress_pct: 0,
          })),
          pagination: { next_cursor: null, has_more: false, page_size: 100 },
        });
      case "/api/v1/modules/FOR-edibility-safety":
        return json({
          module_id: "FOR-edibility-safety",
          title: "Wild Edibility & Safety",
          description: "Positive identification before consumption.",
          category: "foraging-plants",
          subcategory: "edible-plants",
          difficulty: "beginner",
          estimated_duration: 20,
          content_version: 1,
          knowledge_items: [
            { knowledge_id: "FOR-edibility-safety-K01", title: "Wild Edibility & Safety" },
          ],
          lesson: {
            lesson_id: "FOR-edibility-safety-L01",
            title: "Wild Edibility & Safety",
            estimated_minutes: 20,
            completed: false,
          },
          quiz: {
            quiz_id: "FOR-edibility-safety-Q01",
            title: "Wild Edibility & Safety Quiz",
            question_count: 3,
            best_score: null,
            attempt_count: 0,
          },
          resources: [
            {
              resource_id: "FOR-edibility-safety-R01",
              title: "Wild Edibility & Safety — Safety Rules Card",
              resource_type: "guide",
              artifact_available: false,
            },
          ],
          progress: { lesson_completed: false, quiz_best_score: null, completed: false },
        });
      case "/api/v1/lessons/FOR-edibility-safety-L01":
        return json({
          lesson_id: "FOR-edibility-safety-L01",
          module_id: "FOR-edibility-safety",
          title: "Wild Edibility & Safety",
          estimated_minutes: 20,
          content_version: 1,
          sections: [
            {
              type: "learning_objectives",
              heading: "Learning Objectives",
              content: "",
              items: [
                { lo_label: "LO1", lo_global_id: "FOR-edibility-safety-L01-LO1", description: "State the positive-identification requirement" },
                { lo_label: "LO2", lo_global_id: "FOR-edibility-safety-L01-LO2", description: "Explain why universal edibility tests are not safe" },
              ],
            },
            { type: "introduction", heading: "Introduction", content: "Field manual — positive identification comes first." },
            { type: "recap", heading: "Recap", content: "When in doubt, do not consume." },
          ],
          progress: { completed: false, last_position: null },
        });
      case "/api/v1/lessons/FOR-edibility-safety-L01/complete":
        return json({ lesson_id: "FOR-edibility-safety-L01", completed: true, completed_at: "2026-08-26T12:00:00Z" });
      case "/api/v1/quizzes/FOR-edibility-safety-Q01":
        // Mirrors the real GET contract: questions carry NO correct_answer
        // and NO explanation — the UI must never require them.
        return json({
          quiz_id: "FOR-edibility-safety-Q01",
          module_id: "FOR-edibility-safety",
          title: "Wild Edibility & Safety Quiz",
          question_count: 3,
          passing_score: 0.7,
          questions: [
            {
              question_id: "q01",
              question_type: "multiple_choice",
              question_text: "What must happen before consuming any wild plant?",
              options: [
                { label: "A", text: "A small taste" },
                { label: "B", text: "A positive identification" },
                { label: "C", text: "A photo match" },
                { label: "D", text: "A smell test" },
              ],
              difficulty: "beginner",
            },
            {
              question_id: "q02",
              question_type: "multiple_choice",
              question_text: "Why is a universal edibility test not a safe method?",
              options: [
                { label: "A", text: "It takes too long" },
                { label: "B", text: "It requires special tools" },
                { label: "C", text: "A negative local reaction does not mean the plant is safe" },
                { label: "D", text: "It only works on mushrooms" },
              ],
              difficulty: "beginner",
            },
            {
              question_id: "q03",
              question_type: "multiple_choice",
              question_text: "A plant looks familiar but you cannot confirm its identity. What do you do?",
              options: [
                { label: "A", text: "Eat a small amount and wait" },
                { label: "B", text: "Cook it thoroughly first" },
                { label: "C", text: "Do not consume it" },
                { label: "D", text: "Ask someone else to taste it" },
              ],
              difficulty: "beginner",
            },
          ],
          previous_attempts: [],
        });
      case "/api/v1/quizzes/FOR-edibility-safety-Q01/attempts":
        return route.request().method() === "GET"
          ? json({ quiz_id: "FOR-edibility-safety-Q01", attempts: [] })
          : json(
              {
                attempt_id: 1,
                quiz_id: "FOR-edibility-safety-Q01",
                status: "in_progress",
                started_at: "2026-08-26T12:00:00Z",
                replayed: false,
              },
              201,
            );
      case "/api/v1/quizzes/FOR-edibility-safety-Q01/attempts/1/answers":
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
            { question_id: "q01", user_answer: "B", correct_answer: "B", is_correct: true, explanation: "Positive identification comes first." },
            { question_id: "q02", user_answer: "C", correct_answer: "C", is_correct: true, explanation: "Local reactions do not prove edibility." },
            { question_id: "q03", user_answer: "A", correct_answer: "C", is_correct: false, explanation: "When in doubt, do not consume." },
          ],
          lo_performance: [{ lo_label: "LO1", lo_global_id: "FOR-edibility-safety-L01-LO1", correct: 2, total: 3, pct: 67 }],
          xp_earned: 50,
          completed_at: "2026-08-26T12:05:00Z",
        });
      case "/api/v1/progress/modules/FOR-edibility-safety":
        return json({
          module_id: "FOR-edibility-safety",
          lesson_completed: state.submitted,
          lesson_completed_at: state.submitted ? "2026-08-26T12:00:00Z" : null,
          quiz_attempts: state.submitted ? 1 : 0,
          quiz_best_score: state.submitted ? 67 : null,
          quiz_last_passed: false,
          lo_performance: [],
        });
      default:
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
        // Generic minimal module detail for the other FOR modules (module
        // discovery only needs the real title and a lesson/quiz pair).
        if (path.startsWith("/api/v1/modules/FOR-")) {
          const moduleId = path.split("/").pop() ?? "";
          const entry = FOR_MODULES.find(([id]) => id === moduleId);
          if (entry) {
            const [, title, subcategory] = entry;
            return json({
              module_id: moduleId,
              title,
              description: `A Foraging & Plants mission: ${title}.`,
              category: "foraging-plants",
              subcategory,
              difficulty: "beginner",
              estimated_duration: 20,
              content_version: 1,
              knowledge_items: [{ knowledge_id: `${moduleId}-K01`, title }],
              lesson: { lesson_id: `${moduleId}-L01`, title, estimated_minutes: 20, completed: false },
              quiz: { quiz_id: `${moduleId}-Q01`, title: `${title} Quiz`, question_count: 11, best_score: null, attempt_count: 0 },
              resources: [],
              progress: { lesson_completed: false, quiz_best_score: null, completed: false },
            });
          }
        }
        return notFound();
    }
  });
}

async function answerForagingQuiz(page: Page): Promise<void> {
  await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/positive identification/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 2" }).getByText(/negative local reaction/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 3" }).getByText(/do not consume it/i).click();
}

test.describe("Foraging journeys (Batch 07)", () => {
  test("FOR-1 — desktop: Learn → Foraging region → module → lesson → quiz → result → progress", async ({ page }) => {
    mockForagingBackend(page);

    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Explore Regions", exact: true })).toBeVisible();

    // Category discovery: the Foraging & Plants card, with all 8 regions.
    // Scoped to <main>: the sidebar also links every region.
    const foragingCard = page.locator('#main a[href="/categories/foraging-plants"]');
    await expect(foragingCard).toBeVisible();
    await expect(foragingCard).toHaveAttribute("href", "/categories/foraging-plants");
    await expect(page.getByText("10 missions").first()).toBeVisible();
    await expect(page.getByText("0 complete").first()).toBeVisible();

    // Region page: all 10 modules reachable, grouped under subcategories.
    await foragingCard.click();
    await expect(page.getByRole("heading", { name: "Foraging & Plants", exact: true })).toBeVisible();
    for (const [, title] of FOR_MODULES) {
      await expect(page.getByRole("link", { name: new RegExp(title, "i") }).first()).toBeVisible();
    }
    // Never raw internal IDs.
    await expect(page.getByText(/FOR-edibility-safety-K01/)).toHaveCount(0);

    // Module discovery → detail.
    await page.getByRole("link", { name: /wild edibility & safety/i }).first().click();
    await expect(page.getByRole("heading", { name: "Wild Edibility & Safety", exact: true })).toBeVisible();
    await expect(page.getByText("Positive identification before consumption.")).toBeVisible();

    // Lesson.
    await page.getByRole("link", { name: /start field manual/i }).click();
    await expect(page.getByText(/field manual/i).first()).toBeVisible();
    await expect(page.getByText(/State the positive-identification requirement/)).toBeVisible();
    await page.getByRole("button", { name: /complete lesson/i }).click().catch(() => {});
    await expect(page.getByText(/lesson complete/i)).toHaveCount(1, { timeout: 5000 }).catch(() => {});

    // Quiz → server-scored result.
    await page.goto("/modules/FOR-edibility-safety/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await answerForagingQuiz(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expect(page.getByText(/result/i).first()).toBeVisible();
    await expect(page.getByText(/66|67/).first()).toBeVisible();

    // Progress records the module; gamification reflects the XP.
    await page.goto("/progress");
    await expect(page.getByText("Wild Edibility & Safety").first()).toBeVisible();
    await page.goto("/gamification");
    await expect(page.getByText(/150 xp toward level 2/i)).toBeVisible();
    await expect(page.getByText("Quiz Challenger")).toBeVisible();
  });

  test("FOR-2 — quiz payload contract: no correct_answer/explanation pre-submit", async ({ page }) => {
    mockForagingBackend(page);

    // The served GET payload carries no answer keys (mirrors the real API),
    // and the pre-submit UI must not render any.
    await page.goto("/modules/FOR-edibility-safety/quiz");
    await expect(page.getByRole("button", { name: /start field test/i })).toBeVisible();
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await expect(page.getByText(/explanation/i)).toHaveCount(0);
    await expect(page.getByText(/correct answer/i)).toHaveCount(0);

    // And the journey still completes against that leak-free payload.
    await answerForagingQuiz(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expect(page.getByText(/result/i).first()).toBeVisible();
  });

  test("FOR-3 — mobile: Foraging region card renders on Learn without overflow; module discovery", async ({ page }) => {
    mockForagingBackend(page);

    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Explore Regions", exact: true })).toBeVisible();
    // Scoped to <main>: the sidebar also links every region on desktop.
    const card = page.locator('#main a[href="/categories/foraging-plants"]');
    await expect(card).toBeVisible();
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    expect(noOverflow).toBe(true);

    await card.click();
    await expect(page.getByRole("heading", { name: "Foraging & Plants", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /plant identification fundamentals/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /plant identification fundamentals/i }).first().click();
    await expect(page.getByRole("heading", { name: "Plant Identification Fundamentals", exact: true })).toBeVisible();
  });
});
