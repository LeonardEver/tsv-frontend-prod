/**
 * Release journey E2E (Phase 15 §44) — the MVP-wide acceptance path:
 *
 *   RJ-1 full product journey: dashboard → learn → category → module →
 *        lesson → complete → quiz → result → progress → gamification →
 *        profile → sign out.
 *   RJ-2 un-gated quiz release check (DEC-022): quiz completable with
 *        zero lessons done — no prerequisite copy anywhere.
 *   RJ-3 cross-user isolation: Alice learns and leaves a quiz draft →
 *        signs out → Bob signs in on the SAME browser (no storage wipe)
 *        → sees none of Alice's data and is never offered her draft.
 *   RJ-4 mobile core journey.
 *
 * One stateful mock backend per test. The session lives in the mock:
 * POST /auth/logout destroys it (the real backend does the same) and
 * the next /auth/me answer belongs to whoever "signs in" next.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

interface ReleaseUser {
  user_id: number;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
}

interface ReleaseState {
  user: ReleaseUser | null;
  lessonCompleted: boolean;
  quizSubmitted: boolean;
  totalXp: number;
  streak: number;
  achievementsEarned: number;
}

const ALICE: ReleaseUser = {
  user_id: 1,
  email: "alice@example.com",
  display_name: "Alice",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

const BOB: ReleaseUser = {
  user_id: 2,
  email: "bob@example.com",
  display_name: "Bob",
  role: "user",
  created_at: "2026-08-02T12:00:00Z",
};

function mockReleaseBackend(page: Page, initialUser: ReleaseUser): ReleaseState {
  const state: ReleaseState = {
    user: initialUser,
    lessonCompleted: false,
    quizSubmitted: false,
    totalXp: 0,
    streak: 0,
    achievementsEarned: 0,
  };
  let attemptSeq = 0;

  void page.route(API, (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-1" } }),
      });

    // ── Session: logout destroys it and resets learning state (the next
    //    sign-in is a different backend user). ──
    if (req.method() === "POST" && path === "/api/v1/auth/logout") {
      state.user = null;
      state.lessonCompleted = false;
      state.quizSubmitted = false;
      state.totalXp = 0;
      state.streak = 0;
      state.achievementsEarned = 0;
      return json({ ok: true });
    }

    // ── Learning actions flip authoritative state. ──
    if (req.method() === "POST" && path === "/api/v1/lessons/WAT-boiling-L01/complete") {
      state.lessonCompleted = true;
      state.totalXp += 50;
      return json({ lesson_id: "WAT-boiling-L01", completed: true, completed_at: "2026-08-12T12:00:00Z" });
    }
    if (req.method() === "POST" && path === "/api/v1/quizzes/WAT-boiling-Q01/attempts") {
      attemptSeq += 1;
      return json(
        { attempt_id: attemptSeq, quiz_id: "WAT-boiling-Q01", status: "in_progress", started_at: "2026-08-12T12:00:00Z", replayed: false },
        201,
      );
    }
    const answersMatch = path.match(/\/api\/v1\/quizzes\/WAT-boiling-Q01\/attempts\/(\d+)\/answers$/);
    if (req.method() === "POST" && answersMatch) {
      state.quizSubmitted = true;
      state.totalXp += 75;
      state.streak = 2;
      state.achievementsEarned = 1;
      return json({
        attempt_id: Number(answersMatch[1]),
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
        lo_performance: [],
        xp_earned: 75,
        completed_at: "2026-08-12T12:05:00Z",
      });
    }
    if (req.method() === "GET" && answersMatch) {
      return notFound(); // historical results are fetched via the result route
    }

    switch (path) {
      case "/api/v1/auth/me":
        if (!state.user) {
          return json(
            { error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "e2e-2" } },
            401,
          );
        }
        return json(state.user);
      case "/api/v1/categories":
        return json({
          categories: [
            { slug: "water", code: "WAT", title: "Water", module_count: 1, completed_count: state.quizSubmitted ? 1 : 0 },
            { slug: "fire", code: "FIR", title: "Fire", module_count: 0, completed_count: 0 },
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
                  completed: state.quizSubmitted,
                  progress_pct: state.quizSubmitted ? 100 : 0,
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
              completed: state.quizSubmitted,
              progress_pct: state.quizSubmitted ? 100 : 0,
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
          knowledge_items: [],
          lesson: {
            lesson_id: "WAT-boiling-L01",
            title: "Boiling Water for Purification",
            estimated_minutes: 15,
            completed: state.lessonCompleted,
          },
          quiz: {
            quiz_id: "WAT-boiling-Q01",
            title: "Boiling Water Quiz",
            question_count: 3,
            best_score: state.quizSubmitted ? 67 : null,
            attempt_count: state.quizSubmitted ? 1 : 0,
          },
          resources: [],
          progress: {
            lesson_completed: state.lessonCompleted,
            quiz_best_score: state.quizSubmitted ? 67 : null,
            completed: false,
          },
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
            { type: "section", heading: "The Correct Procedure", content: "1. Pre-filter cloudy water\n2. Bring to a rolling boil" },
            { type: "recap", heading: "Recap", content: "Boiling kills all biological pathogens." },
          ],
          progress: { completed: state.lessonCompleted, last_position: null },
        });
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
      case "/api/v1/progress":
        return json({
          modules_completed: state.lessonCompleted || state.quizSubmitted ? 1 : 0,
          total_modules: 9,
          total_xp: state.totalXp,
          level: 1,
          current_streak: state.streak,
          longest_streak: state.streak,
          recent_activity: state.quizSubmitted
            ? [{ module_id: "WAT-boiling", action: "quiz_completed", score: 67, at: "2026-08-12T12:05:00Z" }]
            : [],
        });
      case "/api/v1/progress/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          lesson_completed: state.lessonCompleted,
          lesson_completed_at: state.lessonCompleted ? "2026-08-12T12:00:00Z" : null,
          quiz_attempts: state.quizSubmitted ? 1 : 0,
          quiz_best_score: state.quizSubmitted ? 67 : null,
          quiz_last_passed: state.quizSubmitted ? false : null,
          lo_performance: [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: state.totalXp,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: state.totalXp > 0 ? 300 - state.totalXp : 300,
          current_streak: state.streak,
          longest_streak: state.streak,
          achievements_earned: state.achievementsEarned,
          recent_transactions: state.quizSubmitted
            ? [{ amount: 75, source: "quiz_passed", at: "2026-08-12T12:05:00Z" }]
            : [],
        });
      case "/api/v1/gamification/achievements":
        return json({
          earned: state.achievementsEarned > 0
            ? [{ achievement_key: "first_water_module", title: "First Water Module", description: "Complete your first Water module", icon: "💧", earned_at: "2026-08-12T12:05:00Z" }]
            : [],
          unearned: [
            { achievement_key: "lesson_scholar", title: "Lesson Scholar", description: "Complete 5 lessons", icon: "📖", progress: { completed: 0, total: 5, pct: 0 } },
            { achievement_key: "week_warrior", title: "Week Warrior", description: "Maintain a 7-day learning streak", icon: "📅" },
          ],
        });
      // The Profile surface (Phase 23) renders identity from this payload;
      // the session switch (logout → Bob) must swap the email with it.
      case "/api/v1/profile":
        if (!state.user) {
          return json(
            { error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "e2e-3" } },
            401,
          );
        }
        return json({
          username: null,
          full_name: null,
          display_name: state.user.display_name,
          email: state.user.email,
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
          member_since: state.user.created_at,
          plan_code: "free",
          plan_name: "Free",
        });
      default:
        return notFound();
    }
  });

  return state;
}

async function answerAll(page: Page): Promise<void> {
  await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 2" }).getByText(/1 minute/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 3" }).getByText(/bacteria/i).click();
}

test.describe("release journey", () => {
  test("RJ-1 — full product journey: learn, quiz, progress, gamification, profile, sign out", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "desktop-nav journey; mobile covered by RJ-4");
    mockReleaseBackend(page, ALICE);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, alice/i })).toBeVisible();

    // Learn → category → module.
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Learn" }).click();
    await expect(page.getByRole("heading", { name: "Explore Regions" })).toBeVisible();
    // The sidebar's Regions rail also links "Water" — scope to the page
    // body. The region hero is asserted AFTER the URL lands (the index
    // page's own cards would otherwise match mid-transition).
    await page.locator("main").getByRole("link", { name: /^water/i }).click();
    await expect(page).toHaveURL(/\/categories\/water$/);
    await expect(page.locator("main").getByRole("heading", { name: /^water$/i })).toBeVisible();
    await page.getByRole("link", { name: /boiling water for purification/i }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();

    // Lesson → complete.
    await page.getByRole("link", { name: /start field manual/i }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
    await page.getByRole("button", { name: /complete lesson/i }).click();
    await expect(page.getByText("Lesson complete")).toBeVisible();
    await page.getByRole("link", { name: /boiling water for purification/i }).first().click();
    await expect(page.getByRole("link", { name: /review field manual/i })).toBeVisible();

    // Quiz → authoritative result.
    await page.getByRole("link", { name: /take field test/i }).click();
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water Quiz" })).toBeVisible();
    await expect(page.getByText("Field test complete")).toBeVisible();
    await expect(page.getByText("67%")).toBeVisible();

    // Progress reflects both actions.
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Progress" }).click();
    await expect(page.getByText("Missions complete")).toBeVisible();
    await expect(page.getByText("11%")).toBeVisible();

    // Gamification: XP from lesson + quiz, achievement earned.
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Rewards" }).click();
    await expect(page.getByText("125", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("First Water Module", { exact: true })).toBeVisible();

    // Profile via the account menu, then sign out → login screen.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /profile/i }).click();
    // The Profile section panel also carries a "Profile" heading — the
    // page title is the PageHeader h1.
    await expect(page.getByRole("heading", { name: "Profile", level: 1 })).toBeVisible();
    await expect(page.locator('input[value="alice@example.com"]')).toBeVisible();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByRole("heading", { name: /practical survival/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /continue with google/i })).toBeVisible();
  });

  test("RJ-2 — quiz without lesson: DEC-022 holds at the release boundary", async ({ page }) => {
    mockReleaseBackend(page, ALICE);
    await page.goto("/modules/WAT-boiling/quiz");
    await expect(page.getByRole("button", { name: /start field test/i })).toBeEnabled();
    await expect(page.getByText(/complete.*lesson.*first/i)).toHaveCount(0);

    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water Quiz" })).toBeVisible();
    await expect(page.getByText("Field test complete")).toBeVisible();

    // The lesson was never a prerequisite and remains untouched.
    await page.goto("/modules/WAT-boiling");
    await expect(page.getByRole("link", { name: /start field manual/i })).toBeVisible();
    await expect(page.getByText(/lesson completed/i)).toHaveCount(0);
  });

  test("RJ-3 — cross-user isolation: Alice's data and draft never reach Bob", async ({ page }) => {
    const state = mockReleaseBackend(page, ALICE);

    // Alice starts a quiz and answers once — the draft is written for
    // user 1 (debounced; wait for the write).
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
    await page.waitForTimeout(500);
    const aliceDraftKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("quiz-draft:1:")),
    );
    expect(aliceDraftKeys.length).toBeGreaterThan(0);

    // Alice signs out through the profile surface.
    await page.goto("/profile");
    await expect(page.locator('input[value="alice@example.com"]')).toBeVisible();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByRole("heading", { name: /practical survival/i })).toBeVisible();

    // Bob signs in — same browser, no storage wipe (session switch is
    // backend-driven; the mock destroyed Alice's session on logout).
    state.user = BOB;
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, bob/i })).toBeVisible();
    await expect(page.getByText(/alice/i)).toHaveCount(0);
    await expect(page.getByText("125", { exact: true })).toHaveCount(0);

    // Bob opens the quiz: Alice's draft is never offered.
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/continue previous attempt/i)).toHaveCount(0);
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Question 1" }).getByLabel(/kills all pathogens/i),
    ).not.toBeChecked();

    // Alice's draft is still on disk (user-scoped keys — deletion is not
    // the isolation mechanism), and Bob has written nothing yet.
    const keysAfter = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("quiz-draft:")),
    );
    expect(keysAfter.length).toBe(1);
  });

  test("RJ-4 — mobile core journey: learn, complete lesson, quiz to result", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only flow");
    mockReleaseBackend(page, ALICE);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, alice/i })).toBeVisible();

    await page.goto("/categories");
    await page.locator("main").getByRole("link", { name: /^water/i }).click();
    await expect(page).toHaveURL(/\/categories\/water$/);
    await page.getByRole("link", { name: /boiling water for purification/i }).click();
    await page.getByRole("link", { name: /start field manual/i }).click();
    await expect(page.getByRole("button", { name: /complete lesson/i })).toBeVisible();
    await page.getByRole("button", { name: /complete lesson/i }).click();
    await expect(page.getByText("Lesson complete")).toBeVisible();

    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water Quiz" })).toBeVisible();
    await expect(page.getByText("Field test complete")).toBeVisible();
  });
});
