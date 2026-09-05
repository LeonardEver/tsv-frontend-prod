/**
 * Phase 24 — programmatic visual QA (spec §33/§34).
 *
 * Every major route is visited with a contract-shaped API mock:
 *   - no horizontal overflow at desktop or mobile viewports
 *   - no console errors
 *   - the page-title design element is present on each route
 *   - a screenshot is captured for the visual review folder
 *
 * The API is mocked at the NETWORK boundary — no real backend.
 */
import { expect, test } from "@playwright/test";

const API = "**/api/v1/**";

function mockApi(page: import("@playwright/test").Page): void {
  void page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "qa-1" } }),
      });

    switch (path) {
      case "/api/v1/auth/me":
        return json({
          user_id: 1,
          email: "learner@example.com",
          display_name: "Alex Learner",
          created_at: "2026-08-01T12:00:00Z",
        });
      case "/api/v1/profile":
        return json({
          username: "field-ranger",
          full_name: "Alex Learner",
          display_name: "Alex Learner",
          email: "learner@example.com",
          bio: "Training for the long haul.",
          country: "Brazil",
          timezone: "America/Sao_Paulo",
          preferred_language: "en",
          experience_level: "intermediate",
          reminder_preference: "weekly",
          learning_goals: "One module per day.",
          profile_visibility: "community",
          avatar_visibility: "community",
          community_display_name: "FieldRanger",
          member_since: "2026-08-01T12:00:00Z",
          plan_code: "survivor",
          plan_name: "Survivor",
        });
      case "/api/v1/progress":
        return json({
          modules_completed: 3,
          total_modules: 9,
          total_xp: 320,
          level: 4,
          current_streak: 3,
          longest_streak: 5,
          recent_activity: [
            { module_id: "WAT-boiling", action: "quiz_completed", score: 85, at: "2026-08-12T12:00:00Z" },
            { module_id: "SUR-preparedness-K01", action: "lesson_completed", score: null, at: "2026-08-11T12:00:00Z" },
          ],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 320,
          level: 4,
          level_title: "Scout",
          xp_to_next_level: 180,
          current_streak: 3,
          longest_streak: 5,
          achievements_earned: 2,
          recent_transactions: [
            { amount: 75, source: "quiz_passed", at: "2026-08-12T12:00:00Z" },
            { amount: 50, source: "lesson_completed", at: "2026-08-11T12:00:00Z" },
          ],
        });
      case "/api/v1/gamification/achievements":
        return json({
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
              progress: { completed: 3, total: 5, pct: 60 },
            },
          ],
        });
      case "/api/v1/categories":
        return json({
          categories: [
            { slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 6, completed_count: 1 },
            { slug: "water", code: "WAT", title: "Water", module_count: 11, completed_count: 1 },
            { slug: "fire", code: "FIR", title: "Fire", module_count: 7, completed_count: 0 },
            { slug: "shelter", code: "SHE", title: "Shelter", module_count: 8, completed_count: 0 },
            { slug: "food", code: "FOD", title: "Food", module_count: 10, completed_count: 0 },
            { slug: "agriculture", code: "AGR", title: "Agriculture", module_count: 9, completed_count: 0 },
            { slug: "foraging-plants", code: "FOR", title: "Foraging & Plants", module_count: 10, completed_count: 0 },
            { slug: "medical-first-aid", code: "MED", title: "Medical & First Aid", module_count: 7, completed_count: 1 },
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
                  completed: true,
                  progress_pct: 100,
                },
                {
                  module_id: "WAT-filtration",
                  title: "Water Filtration",
                  difficulty: "intermediate",
                  estimated_duration: 25,
                  completed: false,
                  progress_pct: 40,
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
              completed: true,
              progress_pct: 100,
            },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 20 },
        });
      case "/api/v1/modules/WAT-boiling":
        return json({
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
            completed: true,
          },
          quiz: {
            quiz_id: "WAT-boiling-Q01",
            title: "Boiling Water Quiz",
            question_count: 4,
            best_score: 85,
            attempt_count: 1,
          },
          resources: [
            {
              resource_id: "WAT-boiling-R01",
              title: "Boiling Water Quick Reference",
              resource_type: "checklist",
              file_format: "PDF",
            },
          ],
          progress: { lesson_completed: true, quiz_best_score: 85, completed: true },
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
            {
              type: "introduction",
              heading: "Introduction",
              content: "If you could carry only one water purification method, boiling would be it.\n\n> **Warning:** Never drink untreated water in an emergency.\n\n> Safety: keep children away from the boiling vessel.",
            },
            {
              type: "section",
              heading: "The Correct Procedure",
              content: "## Steps\n\n1. Pre-filter cloudy water\n2. Bring to a rolling boil\n\n| Altitude | Time |\n| --- | --- |\n| Sea level | 1 min |",
            },
            {
              type: "recap",
              heading: "Recap",
              content: "Boiling kills all biological pathogens.",
            },
          ],
          progress: { completed: true, last_position: null },
        });
      case "/api/v1/quizzes/WAT-boiling-Q01":
        return json({
          quiz_id: "WAT-boiling-Q01",
          module_id: "WAT-boiling",
          title: "Boiling Water Quiz",
          question_count: 2,
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
          ],
          previous_attempts: [],
        });
      case "/api/v1/quizzes/WAT-boiling-Q01/attempts":
        return json({
          quiz_id: "WAT-boiling-Q01",
          attempts: [],
        });
      case "/api/v1/progress/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          lesson_completed: true,
          lesson_completed_at: "2026-08-10T12:00:00Z",
          quiz_attempts: 1,
          quiz_best_score: 85,
          quiz_last_passed: true,
          lo_performance: [{ lo_label: "LO1", lo_global_id: "WAT-boiling-L01-LO1", pct: 85 }],
        });
      case "/api/v1/resources/WAT-boiling-R01":
        return json({
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
        });
      case "/api/v1/subscription":
        return json({
          plan_code: "survivor",
          plan_name: "Survivor",
          price: 9.9,
          currency: "usd",
          billing_period: "month",
          status: "active",
          started_at: "2026-08-01T12:00:00Z",
          current_period_started_at: null,
          renews_at: null,
          ends_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          provider: null,
          entitlements: {
            daily_lessons: 10,
            daily_quizzes: 10,
            resource_download: true,
            quiz_before_lesson: true,
            community: true,
          },
        });
      case "/api/v1/usage":
        return json({
          plan_code: "survivor",
          plan_name: "Survivor",
          usage_date: "2026-08-26",
          lesson_completions: 4,
          quiz_attempts: 2,
          limits: { daily_lessons: 10, daily_quizzes: 10 },
          resets_at: "2026-08-27T03:00:00.000Z",
        });
      case "/api/v1/plans":
        return json({
          current_plan_code: "survivor",
          plans: [
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
          ],
        });
      case "/api/v1/community/categories":
        return json({
          categories: [
            { code: "general", name: "General" },
            { code: "water", name: "Water" },
            { code: "fire", name: "Fire" },
            { code: "shelter", name: "Shelter" },
            { code: "food", name: "Food" },
            { code: "agriculture", name: "Agriculture" },
            { code: "medical", name: "Medical" },
            { code: "navigation", name: "Navigation" },
            { code: "questions", name: "Questions" },
          ],
        });
      case "/api/v1/community/posts":
        return json({
          posts: [
            {
              post_id: 1,
              category_code: "water",
              category_name: "Water",
              title: "Boiling at altitude — field notes",
              body_excerpt: "Does boiling time change above 2,000m? I tested in the mountains…",
              author: {
                display_name: "FieldRanger",
                bio: "Training for the long haul.",
                member_since: "2026-08-01T12:00:00Z",
                avatar_visible: true,
              },
              vote_score: 12,
              comment_count: 3,
              created_at: "2026-08-20T12:00:00Z",
              updated_at: "2026-08-20T12:00:00Z",
              voted_by_me: true,
              mine: false,
            },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 20 },
        });
      case "/api/v1/community/posts/1":
        return json({
          post_id: 1,
          category_code: "water",
          category_name: "Water",
          title: "Boiling at altitude — field notes",
          body: "Does boiling time change above 2,000m? I tested in the mountains and here are my notes.",
          author: {
            display_name: "FieldRanger",
            bio: "Training for the long haul.",
            member_since: "2026-08-01T12:00:00Z",
            avatar_visible: true,
          },
          vote_score: 12,
          comment_count: 1,
          created_at: "2026-08-20T12:00:00Z",
          updated_at: "2026-08-20T12:00:00Z",
          voted_by_me: true,
          mine: false,
        });
      case "/api/v1/community/posts/1/comments":
        return json({
          comments: [
            {
              comment_id: 1,
              post_id: 1,
              body: "Yes — water boils at lower temperature at altitude. Extend the time.",
              author: {
                display_name: "Alex Learner",
                bio: null,
                member_since: "2026-08-01T12:00:00Z",
                avatar_visible: true,
              },
              vote_score: 4,
              created_at: "2026-08-21T12:00:00Z",
              updated_at: "2026-08-21T12:00:00Z",
              voted_by_me: false,
              mine: true,
            },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 20 },
        });
      default:
        return notFound();
    }
  });
}

const ROUTES = [
  "/dashboard",
  "/categories",
  "/categories/water",
  "/modules/WAT-boiling",
  "/modules/WAT-boiling/lesson",
  "/modules/WAT-boiling/quiz",
  "/progress",
  "/gamification",
  "/profile",
  "/plans",
  "/community",
  "/community/posts/1",
] as const;

function slugFor(route: string): string {
  return route === "/" ? "home" : route.replaceAll("/", "-").replace(/^-/, "");
}

/**
 * Routes whose dominant h1 is hand-rolled (Phase 23 quiz + post detail)
 * without the `.page-title` class that PageHeader emits on every other
 * page. The heading treatment is the same font-display style — the check
 * maps the page-title invariant to the plain h1 for these two.
 */
const HANDROLLED_H1_ROUTES: ReadonlySet<string> = new Set([
  "/modules/WAT-boiling/quiz",
  "/community/posts/1",
]);

test.describe("Phase 24 visual QA", () => {
  for (const route of ROUTES) {
    test(`desktop: ${route} renders without overflow or console errors`, async ({ page }) => {
      mockApi(page);
      const errors: string[] = [];
      page.on("console", (msg) => {
        // Browser network-layer noise for intentionally mocked non-2xx
        // responses (the app handles them) — not application errors.
        const text = msg.text();
        if (msg.type() === "error" && !text.startsWith("Failed to load resource")) {
          errors.push(text);
        }
      });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      // No horizontal overflow.
      const overflow = await page.evaluate(
        () =>
          document.scrollingElement
            ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth
            : 0,
      );
      expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);

      // The page-title design element is present (single dominant h1).
      // Most routes emit `.page-title` via PageHeader; quiz + post detail
      // hand-roll the same dominant h1 without the class (see
      // HANDROLLED_H1_ROUTES).
      const heading = page.locator(
        HANDROLLED_H1_ROUTES.has(route) ? "h1" : "h1.page-title",
      );
      await expect(heading.first()).toBeVisible();
      expect(errors, `console errors on ${route}`).toEqual([]);

      await page.screenshot({
        path: `visual-review/phase24/${slugFor(route)}-desktop.png`,
        fullPage: false,
      });
    });

    test(`mobile: ${route} renders without overflow`, async ({ page }) => {
      mockApi(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(
        () =>
          document.scrollingElement
            ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth
            : 0,
      );
      expect(overflow, `horizontal overflow on mobile ${route}`).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `visual-review/phase24/${slugFor(route)}-mobile.png`,
        fullPage: false,
      });
    });
  }

  test("login: centered brand experience renders cleanly", async ({ page }) => {
    void page.route(API, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "qa-2" } }),
      }),
    );
    const errors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && !text.startsWith("Failed to load resource")) {
        errors.push(text);
      }
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /continue with google/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /practical survival, preparedness and self-reliance/i }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await page.screenshot({ path: "visual-review/phase24/login-desktop.png" });
  });
});
