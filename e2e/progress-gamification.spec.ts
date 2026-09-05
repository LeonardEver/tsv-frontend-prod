/**
 * Progress & Gamification journeys (Phase 14 §41–§42).
 *
 * The mock backend holds a single authoritative state; quiz/lesson
 * actions flip it (mirroring the real backend semantics). The UI must
 * render whatever the mock returns — never derive its own values.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

interface MockLearningState {
  modulesCompleted: number;
  totalXp: number;
  streak: number;
  achievementsEarned: number;
  quizSubmitted: boolean;
  lessonCompleted: boolean;
}

function mockLearningBackend(
  page: Page,
  state: MockLearningState,
): void {
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

    if (req.method() === "POST" && path === "/api/v1/lessons/WAT-boiling-L01/complete") {
      state.lessonCompleted = true;
      state.modulesCompleted = 1;
      state.totalXp += 50;
      return json({ lesson_id: "WAT-boiling-L01", completed: true, completed_at: "2026-08-12T12:00:00Z" });
    }
    if (req.method() === "POST" && path.endsWith("/answers")) {
      state.quizSubmitted = true;
      state.modulesCompleted = 1;
      state.totalXp += 75;
      state.streak = 2;
      state.achievementsEarned = 1;
      return json({
        attempt_id: 1,
        status: "completed",
        score: 100,
        total_questions: 3,
        correct_count: 3,
        passed: true,
        passing_score: 0.7,
        results: [],
        lo_performance: [],
        xp_earned: 75,
        completed_at: "2026-08-12T12:05:00Z",
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
      case "/api/v1/progress":
        return json({
          modules_completed: state.modulesCompleted,
          total_modules: 9,
          total_xp: state.totalXp,
          level: 1,
          current_streak: state.streak,
          longest_streak: state.streak,
          recent_activity: state.quizSubmitted
            ? [{ module_id: "WAT-boiling", action: "quiz_completed", score: 100, at: "2026-08-12T12:05:00Z" }]
            : [],
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
              description: "Learn boiling.",
              completed: state.lessonCompleted,
              // Deliberately 73 — the UI must render this verbatim.
              progress_pct: state.lessonCompleted ? 100 : 73,
            },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 20 },
        });
      case "/api/v1/progress/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          lesson_completed: state.lessonCompleted,
          lesson_completed_at: state.lessonCompleted ? "2026-08-12T12:00:00Z" : null,
          quiz_attempts: state.quizSubmitted ? 1 : 0,
          quiz_best_score: state.quizSubmitted ? 100 : null,
          quiz_last_passed: state.quizSubmitted ? true : null,
          // New users have NO objective performance — consistent state.
          lo_performance: state.quizSubmitted
            ? [{ lo_label: "LO1", lo_global_id: "WAT-boiling-L01-LO1", pct: 85 }]
            : [],
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
            { achievement_key: "week_warrior", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "📅" },
          ],
        });
      case "/api/v1/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          title: "Boiling Water for Purification",
          description: "Learn boiling.",
          category: "water",
          subcategory: "purification",
          difficulty: "beginner",
          estimated_duration: 20,
          content_version: 1,
          knowledge_items: [],
          lesson: { lesson_id: "WAT-boiling-L01", title: "Lesson", estimated_minutes: 15, completed: state.lessonCompleted },
          quiz: { quiz_id: "WAT-boiling-Q01", title: "Boiling Water Quiz", question_count: 3, best_score: state.quizSubmitted ? 100 : null, attempt_count: state.quizSubmitted ? 1 : 0 },
          resources: [],
          progress: { lesson_completed: state.lessonCompleted, quiz_best_score: state.quizSubmitted ? 100 : null, completed: false },
        });
      case "/api/v1/quizzes/WAT-boiling-Q01":
        return json({
          quiz_id: "WAT-boiling-Q01",
          module_id: "WAT-boiling",
          title: "Boiling Water Quiz",
          question_count: 3,
          passing_score: 0.7,
          questions: [
            { question_id: "q01", question_type: "multiple_choice", question_text: "Why is boiling reliable?", options: [{ label: "A", text: "Fastest" }, { label: "B", text: "Tastes better" }, { label: "C", text: "Kills all pathogens" }, { label: "D", text: "Removes chemicals" }], difficulty: "beginner" },
            { question_id: "q02", question_type: "multiple_choice", question_text: "How long at sea level?", options: [{ label: "A", text: "30 sec" }, { label: "B", text: "1 minute" }, { label: "C", text: "5 minutes" }, { label: "D", text: "10 minutes" }], difficulty: "beginner" },
            { question_id: "q03", question_type: "multiple_choice", question_text: "What does boiling NOT remove?", options: [{ label: "A", text: "Bacteria" }, { label: "B", text: "Viruses" }, { label: "C", text: "Protozoa" }, { label: "D", text: "Lead" }], difficulty: "beginner" },
          ],
          previous_attempts: [],
        });
      case "/api/v1/quizzes/WAT-boiling-Q01/attempts":
        if (req.method() === "POST") {
          return json({ attempt_id: 1, quiz_id: "WAT-boiling-Q01", status: "in_progress", started_at: "2026-08-12T12:00:00Z", replayed: false }, 201);
        }
        return notFound();
      default:
        return notFound();
    }
  });
}

/** Academy completion (Phase 23): the header ring percent is the pure
 * rendering of modules_completed / total_modules from /progress; the
 * "Missions complete" stat renders the authoritative count verbatim.
 * Together they replace the old "N / M" text. */
async function expectAcademyCompletion(page: Page, completed: number, total = 9): Promise<void> {
  const pct = Math.round((completed / total) * 100);
  await expect(page.getByText(`${pct}%`, { exact: true })).toBeVisible();
  const missions = page.getByText("Missions complete").locator("..");
  await expect(missions.getByText(String(completed), { exact: true })).toBeVisible();
}

/** Quiz result hero (Phase 23): "Field test complete" eyebrow + title h1. */
async function expectQuizResult(page: Page): Promise<void> {
  await expect(page.getByText("Field test complete")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Boiling Water Quiz" })).toBeVisible();
}

test.describe("progress journeys", () => {
  test("FLOW 1 — new user sees the empty state", async ({ page }) => {
    mockLearningBackend(page, {
      modulesCompleted: 0,
      totalXp: 0,
      streak: 0,
      achievementsEarned: 0,
      quizSubmitted: false,
      lessonCompleted: false,
    });
    await page.goto("/progress");
    await expectAcademyCompletion(page, 0);
    await expect(page.getByText(/no learning activity yet/i)).toBeVisible();
    await expect(page.getByText(/no objective performance yet/i)).toBeVisible();
  });

  test("FLOW 2 — active user: module rows link to modules", async ({ page }) => {
    mockLearningBackend(page, {
      modulesCompleted: 1,
      totalXp: 125,
      streak: 2,
      achievementsEarned: 1,
      quizSubmitted: true,
      lessonCompleted: false,
    });
    await page.goto("/progress");
    await expectAcademyCompletion(page, 1);
    const module = page.getByRole("link", { name: /boiling water for purification/i });
    await expect(module).toHaveAttribute("href", "/modules/WAT-boiling");
    await expect(module.getByText(/quiz: 100%/i)).toBeVisible();
    await module.click();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
    await page.goto("/progress");
    await expectAcademyCompletion(page, 1);
  });

  test("FLOW 3 — post quiz: progress reflects the authoritative update", async ({ page }) => {
    const state: MockLearningState = {
      modulesCompleted: 0,
      totalXp: 0,
      streak: 0,
      achievementsEarned: 0,
      quizSubmitted: false,
      lessonCompleted: false,
    };
    mockLearningBackend(page, state);
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("radiogroup", { name: "Question 2" }).getByText(/1 minute/i).click();
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("radiogroup", { name: "Question 3" }).getByText(/bacteria/i).click();
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expectQuizResult(page);

    await page.goto("/progress");
    await expectAcademyCompletion(page, 1);
    await expect(page.getByText(/quiz: 100%/i)).toBeVisible();
  });

  test("FLOW 4 — post lesson: progress reflects the authoritative update", async ({ page }) => {
    const state: MockLearningState = {
      modulesCompleted: 0,
      totalXp: 0,
      streak: 0,
      achievementsEarned: 0,
      quizSubmitted: false,
      lessonCompleted: false,
    };
    mockLearningBackend(page, state);
    // Simulate the lesson completion via the API the lesson screen uses —
    // driven through the module flow instead of the full lesson UI.
    await page.goto("/progress");
    await expectAcademyCompletion(page, 0);
    await page.evaluate(() => {
      void fetch("/api/v1/lessons/WAT-boiling-L01/complete", { method: "POST", credentials: "include" });
    });
    await page.reload();
    await expectAcademyCompletion(page, 1);
  });

  test("FLOW 5 — mobile progress", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only flow");
    mockLearningBackend(page, {
      modulesCompleted: 1,
      totalXp: 125,
      streak: 2,
      achievementsEarned: 1,
      quizSubmitted: true,
      lessonCompleted: false,
    });
    await page.goto("/progress");
    await expectAcademyCompletion(page, 1);
    await expect(page.getByRole("link", { name: /boiling water for purification/i })).toBeVisible();
  });
});

test.describe("gamification journeys", () => {
  test("FLOW 6 — gamification surface: XP, level, streak, achievements", async ({ page }) => {
    mockLearningBackend(page, {
      modulesCompleted: 1,
      totalXp: 125,
      streak: 2,
      achievementsEarned: 1,
      quizSubmitted: true,
      lessonCompleted: false,
    });
    await page.goto("/gamification");
    await expect(page.getByText("125", { exact: true }).first()).toBeVisible();
    // Level + title: LevelBadge "LVL 1" and the hero title "Novice"
    // (the old combined "Level 1 · Novice" line). The AppShell also
    // renders LevelBadges — scope to the page content.
    const main = page.locator("main");
    await expect(main.getByText("LVL 1")).toBeVisible();
    await expect(main.getByText("Novice", { exact: true })).toBeVisible();
    await expect(page.getByText("2 days", { exact: true })).toBeVisible();
    await expect(page.getByText("First Water Module", { exact: true })).toBeVisible();
    // Earned card carries the authoritative date ("Earned <date>"); the
    // two unearned achievements render "Not earned".
    await expect(page.getByText(/^earned /i)).toBeVisible();
    await expect(page.getByText("Not earned", { exact: true })).toHaveCount(2);
    // week_warrior has NO progress in the fixture → no progress bar;
    // lesson_scholar carries the authoritative pct → bar rendered.
    await expect(page.getByRole("progressbar", { name: /week warrior progress/i })).toHaveCount(0);
    await expect(page.getByRole("progressbar", { name: /lesson scholar progress/i })).toHaveCount(1);
  });

  test("FLOW 7 — after a learning action, gamification reflects the server state", async ({ page }) => {
    const state: MockLearningState = {
      modulesCompleted: 0,
      totalXp: 0,
      streak: 0,
      achievementsEarned: 0,
      quizSubmitted: false,
      lessonCompleted: false,
    };
    mockLearningBackend(page, state);
    await page.goto("/gamification");
    await expect(page.getByText("0", { exact: true }).first()).toBeVisible(); // zero XP before

    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("radiogroup", { name: "Question 2" }).getByText(/1 minute/i).click();
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("radiogroup", { name: "Question 3" }).getByText(/bacteria/i).click();
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expectQuizResult(page);

    await page.goto("/gamification");
    // "75" also appears inside "175 XP to the next level" and the header
    // chip — the XP card's exact value is the first exact match.
    await expect(page.getByText("75", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/quiz passed/i)).toBeVisible();
  });

  test("FLOW 8 — mobile gamification", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only flow");
    mockLearningBackend(page, {
      modulesCompleted: 1,
      totalXp: 125,
      streak: 2,
      achievementsEarned: 1,
      quizSubmitted: true,
      lessonCompleted: false,
    });
    await page.goto("/gamification");
    await expect(page.getByText("125", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("First Water Module", { exact: true })).toBeVisible();
  });
});
