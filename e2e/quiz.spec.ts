/**
 * Quiz journey E2E (Phase 13 §53).
 *
 * Flows: normal, quiz-without-lesson, refresh/draft recovery, network
 * failure + same-logical-submission retry, duplicate submission (409 →
 * historical result), mobile, keyboard.
 *
 * The mock backend mirrors the REAL contract: safe payload (no correct
 * answers), idempotent attempt creation per Idempotency-Key, single
 * grading per attempt (409 afterwards), historical result retrieval.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

interface QuizMockOptions {
  /** Fail the FIRST submit request as a network error (route.abort). */
  failFirstSubmit?: boolean;
}

interface MockState {
  attemptIds: string[];
  creationKeys: string[];
  submissionKeys: string[];
  gradedAttempts: Set<string>;
  currentAttempt: number;
}

function mockQuizBackend(page: Page, options: QuizMockOptions = {}): MockState {
  const state: MockState = {
    attemptIds: [],
    creationKeys: [],
    submissionKeys: [],
    gradedAttempts: new Set(),
    currentAttempt: 0,
  };
  let submitCount = 0;

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
    const error = (code: string, message: string, status: number) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: { code, message, request_id: "e2e-2" } }),
      });

    const resultFor = (attemptId: string) => ({
      attempt_id: Number(attemptId),
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
    });

    if (req.method() === "POST" && path.endsWith("/attempts") && !path.includes("/answers")) {
      const key = req.headers()["idempotency-key"] ?? "";
      const existing = state.creationKeys.indexOf(key);
      if (key && existing !== -1) {
        return json({
          attempt_id: Number(state.attemptIds[existing]),
          quiz_id: "WAT-boiling-Q01",
          status: "in_progress",
          started_at: "2026-08-12T12:00:00Z",
          replayed: true,
        });
      }
      state.currentAttempt += 1;
      const attemptId = String(state.currentAttempt);
      state.creationKeys.push(key);
      state.attemptIds.push(attemptId);
      return json(
        {
          attempt_id: Number(attemptId),
          quiz_id: "WAT-boiling-Q01",
          status: "in_progress",
          started_at: "2026-08-12T12:00:00Z",
          replayed: false,
        },
        201,
      );
    }

    const answersMatch = path.match(/\/attempts\/(\d+)\/answers$/);
    if (req.method() === "POST" && answersMatch) {
      const attemptId = answersMatch[1];
      if (!attemptId) return notFound();
      state.submissionKeys.push((req.postDataJSON() as { idempotency_key?: string }).idempotency_key ?? "");
      if (options.failFirstSubmit && submitCount === 0) {
        submitCount += 1;
        void route.abort("failed"); // real network failure at the boundary
        return;
      }
      submitCount += 1;
      if (state.gradedAttempts.has(attemptId)) {
        return error("CONFLICT", `Attempt ${attemptId} is already completed`, 409);
      }
      state.gradedAttempts.add(attemptId);
      return json(resultFor(attemptId));
    }

    const resultMatch = path.match(/\/attempts\/(\d+)$/);
    if (req.method() === "GET" && resultMatch) {
      const attemptId = resultMatch[1];
      if (!attemptId || !state.gradedAttempts.has(attemptId)) return notFound();
      return json(resultFor(attemptId));
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
          lesson: { lesson_id: "WAT-boiling-L01", title: "Lesson", estimated_minutes: 15, completed: false },
          quiz: { quiz_id: "WAT-boiling-Q01", title: "Boiling Water Quiz", question_count: 3, best_score: null, attempt_count: 0 },
          resources: [],
          progress: { lesson_completed: false, quiz_best_score: null, completed: false },
        });
      // The restyled quiz page also surfaces subscription entitlements,
      // per-module progress and the achievement snapshot; the AppShell
      // reads the gamification summary. The mock serves them all with
      // realistic authoritative zero state (the REAL contract) — leaving
      // them 404 would trip the quiz loading gate during the post-submit
      // invalidation refetch and destroy the session.
      case "/api/v1/subscription":
        return json({
          plan_code: "survivor",
          plan_name: "Survivor",
          price: 9.9,
          currency: "usd",
          billing_period: "month",
          status: "active",
          started_at: "2026-08-01T12:00:00Z",
          current_period_started_at: "2026-08-01T12:00:00Z",
          renews_at: "2026-09-01T12:00:00Z",
          ends_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          provider: null,
          entitlements: {
            daily_lessons: null,
            daily_quizzes: null,
            resource_download: true,
            quiz_before_lesson: true,
            community: true,
          },
        });
      case "/api/v1/progress/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          lesson_completed: false,
          lesson_completed_at: null,
          quiz_attempts: 0,
          quiz_best_score: null,
          quiz_last_passed: null,
          lo_performance: [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 0,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 300,
          current_streak: 0,
          longest_streak: 0,
          achievements_earned: 0,
          recent_transactions: [],
        });
      case "/api/v1/gamification/achievements":
        return json({ earned: [], unearned: [] });
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
      default:
        return notFound();
    }
  });

  return state;
}

async function answerAll(page: Page): Promise<void> {
  // Click the VISIBLE option text (inside the label) — clicking the
  // sr-only radio directly is intercepted by the decorative indicator.
  await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 2" }).getByText(/1 minute/i).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("radiogroup", { name: "Question 3" }).getByText(/bacteria/i).click();
}

/** Result hero (Phase 23): "Field test complete" eyebrow + quiz title h1 —
 * replaces the old "— result" heading. */
async function expectResultShown(page: Page): Promise<void> {
  await expect(page.getByText("Field test complete")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Boiling Water Quiz" })).toBeVisible();
}

test.describe("quiz journeys", () => {
  test("FLOW 1 — normal: complete quiz and return to module", async ({ page }) => {
    mockQuizBackend(page);
    await page.goto("/modules/WAT-boiling");
    await page.getByRole("link", { name: /take field test/i }).click();

    await expect(page.getByRole("heading", { name: "Boiling Water Quiz" })).toBeVisible();
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();

    await answerAll(page);
    await expect(page.getByText("3 of 3 answered")).toBeVisible();
    await page.getByRole("button", { name: /submit field test/i }).click();

    await expectResultShown(page);
    // The authoritative score appears twice: the result-hero ring and the
    // LO performance row (same server value).
    await expect(page.getByText("67%").first()).toBeVisible();
    await expect(page.getByText(/boiling does not remove heavy metals/i)).toBeVisible();

    // "Back to Module" is the result action card.
    await page.getByRole("link", { name: "Back to Module" }).click();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
  });

  test("FLOW 2 — quiz without lesson: no prerequisite exists", async ({ page }) => {
    mockQuizBackend(page);
    await page.goto("/modules/WAT-boiling/quiz");
    await expect(page.getByRole("button", { name: /start field test/i })).toBeEnabled();
    // The QuizLocked gate (Phase 21 §5) is never shown for this user.
    await expect(page.getByText(/complete the lesson to unlock/i)).toHaveCount(0);

    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expectResultShown(page);
  });

  test("FLOW 3 — refresh: draft recovery and continue", async ({ page }) => {
    mockQuizBackend(page);
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();

    await page.getByRole("radiogroup", { name: "Question 1" }).getByText(/kills all pathogens/i).click();
    await page.waitForTimeout(500); // debounced draft write

    await page.reload();
    await expect(page.getByText(/continue previous attempt/i)).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Question 1" }).getByLabel(/kills all pathogens/i),
    ).toBeChecked();
  });

  test("FLOW 4 — network failure: retry reuses the same logical submission", async ({ page }) => {
    const state = mockQuizBackend(page, { failFirstSubmit: true });
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();

    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();

    // Network failure — the draft is preserved and a retry is offered.
    await expect(page.getByRole("button", { name: /retry submission/i })).toBeVisible();
    await page.getByRole("button", { name: /retry submission/i }).click();

    await expectResultShown(page);
    // SAME logical submission → SAME idempotency key for both requests.
    expect(state.submissionKeys.length).toBe(2);
    expect(state.submissionKeys[0]).toBeTruthy();
    expect(state.submissionKeys[1]).toBe(state.submissionKeys[0]);
  });

  test("FLOW 5 — duplicate submission: 409 recovers the historical result", async ({ page }) => {
    const state = mockQuizBackend(page);
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();

    await answerAll(page);
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expectResultShown(page);
    const attemptId = state.attemptIds[0];
    if (!attemptId) throw new Error("no attempt created");

    // Simulate the lost-response case: the server graded, the client
    // never learned, and the draft survived. Re-submit → 409 → recover.
    await page.evaluate((id) => {
      localStorage.setItem(
        `quiz-draft:1:WAT-boiling-Q01:${id}`,
        JSON.stringify({
          version: 1,
          userId: 1,
          quizId: "WAT-boiling-Q01",
          attemptId: Number(id),
          answers: { q01: "C" },
          currentQuestionIndex: 2,
          updatedAt: Date.now(),
        }),
      );
    }, attemptId);

    await page.reload();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /submit field test/i }).click();

    // 409 → historical result recovered, not an error.
    await expectResultShown(page);
    await expect(page.getByText("67%").first()).toBeVisible();
  });

  test("FLOW 6 — mobile: full quiz flow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only flow");
    mockQuizBackend(page);
    await page.goto("/modules/WAT-boiling/quiz");
    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();

    await answerAll(page);
    await expect(page.getByRole("button", { name: /submit field test/i })).toBeVisible();
    await page.getByRole("button", { name: /submit field test/i }).click();
    await expectResultShown(page);
  });

  test("FLOW 7 — keyboard-only interaction", async ({ page }) => {
    mockQuizBackend(page);
    await page.goto("/modules/WAT-boiling/quiz");

    // Keyboard: focus and activate Start.
    await page.getByRole("button", { name: /start field test/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/question 1 of 3/i)).toBeVisible();

    // Keyboard: select via arrows + space/enter on radios.
    const firstGroup = page.getByRole("radiogroup", { name: "Question 1" });
    await firstGroup.getByLabel(/kills all pathogens/i).focus();
    await page.keyboard.press("Space");
    await expect(firstGroup.getByLabel(/kills all pathogens/i)).toBeChecked();

    // Keyboard: navigate via the question navigator.
    await page.getByRole("navigation", { name: /question navigator/i })
      .getByRole("button", { name: /question 3, unanswered/i })
      .click();
    await expect(page.getByText(/question 3 of 3/i)).toBeVisible();

    // Keyboard: submit.
    await page.getByRole("button", { name: /submit field test/i }).focus();
    await page.keyboard.press("Enter");
    await expectResultShown(page);
  });
});
