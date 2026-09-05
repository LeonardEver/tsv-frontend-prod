/**
 * Lesson journey E2E (Phase 12 §30):
 *
 *   authenticated → Module → Lesson → verify title/objectives/sections →
 *   complete → verify completed state → Quiz CTA → back to Module.
 *
 * Plus: direct deep link, refresh, mobile, and the un-gated Quiz.
 * API mocked at the network boundary; the lesson POST persists completion
 * in the mock (mirroring the backend's authoritative upsert semantics).
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

function mockLessonSurface(page: Page): void {
  let lessonCompleted = false;

  void page.route(API, (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    if (req.method() === "POST" && path === "/api/v1/lessons/WAT-boiling-L01/complete") {
      lessonCompleted = true;
      return json({
        lesson_id: "WAT-boiling-L01",
        completed: true,
        completed_at: "2026-08-12T12:00:00Z",
      });
    }

    switch (path) {
      case "/api/v1/auth/me":
        return json({
          user_id: 1,
          email: "learner@example.com",
          display_name: "Learner",
          role: "user",
          created_at: "2026-08-01T12:00:00Z",
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
          knowledge_items: [],
          lesson: {
            lesson_id: "WAT-boiling-L01",
            title: "Boiling Water for Purification",
            estimated_minutes: 15,
            completed: lessonCompleted,
          },
          quiz: {
            quiz_id: "WAT-boiling-Q01",
            title: "Boiling Water Quiz",
            question_count: 4,
            best_score: null,
            attempt_count: 0,
          },
          resources: [],
          progress: { lesson_completed: lessonCompleted, quiz_best_score: null, completed: false },
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
                { lo_label: "LO2", lo_global_id: "WAT-boiling-L01-LO2", description: "Describe the correct procedure" },
              ],
            },
            { type: "introduction", heading: "Introduction", content: "Boiling is the most reliable single method." },
            { type: "section", heading: "The Correct Procedure", content: "1. Pre-filter cloudy water\n2. Bring to a rolling boil" },
            { type: "recap", heading: "Recap", content: "Boiling kills all biological pathogens." },
          ],
          progress: { completed: lessonCompleted, last_position: lessonCompleted ? 300 : null },
        });
      default:
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-1" } }),
        });
    }
  });
}

test.describe("lesson journey", () => {
  test("complete lesson flow with un-gated quiz and module reflection", async ({ page }) => {
    mockLessonSurface(page);

    // Module → Lesson.
    await page.goto("/modules/WAT-boiling");
    await page.getByRole("link", { name: /start field manual/i }).click();
    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toBeVisible();

    // Structure: objectives + sections. The new field-manual layout
    // renders learning-objective DESCRIPTIONS (no LO1/LO2 labels).
    await expect(page.getByText("Explain why boiling works").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /the correct procedure/i })).toBeVisible();
    await expect(page.getByText(/rolling boil/i)).toBeVisible();

    // Section navigation scrolls to the anchor.
    await page.getByRole("link", { name: /recap/i }).first().click();
    await expect(page.locator("section[id]").filter({ hasText: "Recap" })).toBeVisible();

    // Quiz CTA exists BEFORE completion (DEC-022) — in the new layout the
    // pre-completion quiz affordance is the "field tests always open" link.
    const quizLink = page.getByRole("link", { name: /field tests are always open/i });
    await expect(quizLink).toBeVisible();
    await expect(quizLink).toHaveAttribute("href", "/modules/WAT-boiling/quiz");
    await expect(quizLink).not.toHaveAttribute("aria-disabled", "true");

    // Complete the lesson — the panel flips into the completion state
    // (UX-04: explicit feedback, not just a disabled button).
    await page.getByRole("button", { name: /complete lesson/i }).click();
    await expect(page.getByText("Lesson complete").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /take field test/i })).toBeVisible();

    // Back to the module (breadcrumb): completion is reflected
    // (authoritative refetch — the manual entry flips to "Review").
    await page.getByRole("link", { name: /boiling water for purification/i }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
    await expect(page.getByRole("link", { name: /review field manual/i })).toBeVisible();
  });

  test("deep link and refresh on the lesson route", async ({ page }) => {
    mockLessonSurface(page);
    await page.goto("/modules/WAT-boiling/lesson");
    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Boiling Water for Purification" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /complete lesson/i })).toBeVisible();
  });

  test("mobile lesson keeps objectives, navigation and completion usable", async ({ page }, testInfo) => {
    mockLessonSurface(page);
    await page.goto("/modules/WAT-boiling/lesson");
    await expect(page.getByText("Explain why boiling works").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /complete lesson/i })).toBeVisible();
    if (testInfo.project.name === "mobile-chromium") {
      // Two "Lesson sections" navs exist (desktop rail + mobile chips);
      // only the visible one matters on each surface.
      await expect(
        page.getByRole("navigation", { name: /lesson sections/i }).filter({ visible: true }),
      ).toBeVisible();
    }
  });
});
