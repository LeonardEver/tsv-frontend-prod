/**
 * Learning-surface E2E (Phase 11 §27): the authenticated discovery flow.
 *
 *   Login → Dashboard → Categories → Category → Module
 *   → verify Lesson action → verify Quiz action → verify Quiz is NOT
 *   blocked → deep link → refresh on a module route.
 *
 * API mocked at the network boundary with contract-shaped responses
 * (no real backend, no real OAuth, never production).
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

function mockLearningSurface(page: Page): void {
  void page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-1" } }),
      });

    switch (path) {
      case "/api/v1/auth/me":
        return json(user);
      case "/api/v1/progress":
        return json({
          modules_completed: 1,
          total_modules: 9,
          total_xp: 125,
          level: 1,
          current_streak: 2,
          longest_streak: 2,
          recent_activity: [
            { module_id: "WAT-boiling", action: "quiz_completed", score: 100, at: "2026-08-10T12:00:00Z" },
          ],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 125,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 175,
          current_streak: 2,
          longest_streak: 2,
          achievements_earned: 1,
          recent_transactions: [],
        });
      case "/api/v1/categories":
        return json({
          categories: [
            { slug: "water", code: "WAT", title: "Water", module_count: 7, completed_count: 1 },
            { slug: "fire", code: "FIR", title: "Fire", module_count: 2, completed_count: 0 },
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
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 1 },
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
          knowledge_items: [{ knowledge_id: "WAT-boiling-K01", title: "Boiling Water for Purification" }],
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
          resources: [],
          progress: { lesson_completed: false, quiz_best_score: null, completed: false },
        });
      default:
        return notFound();
    }
  });
}

test.describe("learning surface", () => {
  test("authenticated discovery flow reaches both learning paths", async ({ page }) => {
    mockLearningSurface(page);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // Next mission from authoritative activity: the module behind the
    // most recent event drives the CTA (lesson not completed → lesson).
    // The hero eyebrow is a <p> in the new shell (not a heading).
    await expect(page.getByText("Your next mission").first()).toBeVisible();
    const missionStart = page.getByRole("link", { name: /start lesson/i });
    await expect(missionStart).toBeVisible();
    await expect(missionStart).toHaveAttribute("href", "/modules/WAT-boiling/lesson");
    // The expedition timeline links the same mission to its module page.
    await expect(
      page.getByRole("link", { name: /boiling water for purification/i }),
    ).toHaveAttribute("href", "/modules/WAT-boiling");

    // Browse: dashboard → categories → category → module.
    await page.goto("/categories");
    // The category card lives in the content region (the sidebar Regions
    // nav also matches /water/i, so scope to #main and anchor on the card
    // heading, not the "Start Here" mission card's title).
    await page.locator("#main").getByRole("link", { name: /^water/i }).click();
    // Region hero h1 (scoped + level so the cards' h3s and substring
    // matches can't resolve during the lazy route transition).
    await expect(
      page.locator("main").getByRole("heading", { level: 1, name: /water/i }),
    ).toBeVisible();
    await page.getByRole("link", { name: /boiling water for purification/i }).click();

    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toBeVisible();

    // The two learning paths — BOTH available (Field Manual / Field Test).
    const lessonLink = page.getByRole("link", { name: /start field manual/i });
    const quizLink = page.getByRole("link", { name: /take field test/i });
    await expect(lessonLink).toBeVisible();
    await expect(quizLink).toBeVisible();

    // PRODUCT RULE: quiz is NOT blocked behind the lesson — no disabled
    // state, no gate text, and a direct link to the quiz route.
    await expect(quizLink).toHaveAttribute("href", "/modules/WAT-boiling/quiz");
    await expect(quizLink).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText(/complete.*lesson.*first/i)).toHaveCount(0);

    // Deep link to the module works and survives a refresh.
    await page.goto("/modules/WAT-boiling");
    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /take field test/i })).toBeVisible();
  });

  test("mobile layout keeps both entry points reachable", async ({ page }, testInfo) => {
    // Only meaningful for mobile emulation projects; desktop viewport
    // still passes (the entries are grid-stacked, never hidden).
    mockLearningSurface(page);

    await page.goto("/modules/WAT-boiling");
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
    await expect(page.getByRole("link", { name: /start field manual/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /take field test/i })).toBeVisible();

    if (testInfo.project.name === "mobile-chromium") {
      // Mobile surfaces use the bottom nav ("Primary mobile"); the desktop
      // sidebar "Primary" nav is hidden below lg.
      await expect(page.getByRole("navigation", { name: "Primary mobile" })).toBeVisible();
    }
  });
});
