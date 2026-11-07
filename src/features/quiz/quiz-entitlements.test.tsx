/**
 * Quiz entitlement states (Phase 21 §5/§17).
 *
 * Free plan: the field test is locked until the module's lesson is
 * completed — rendered as the honest unlock card, never a broken page.
 * Paid plans: open. The DAILY_QUIZ_LIMIT_REACHED submission error
 * surfaces with the stable-code copy. The backend remains the
 * enforcement authority; these tests cover presentation.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { AuthProvider } from "@/features/auth/use-auth";
import { __setTestPlan, testUser } from "@/test/msw/handlers";
import QuizPage from "./index";

const API = "*/api/v1";

function renderQuiz() {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderAtRoute(
    <AuthProvider>
      <QuizPage />
    </AuthProvider>,
    "/modules/WAT-boiling/quiz",
    "/modules/:moduleId/quiz",
  );
}

/** The default per-module progress mock reports lesson_completed: false
 * for WAT-boiling — the Free-plan gate depends on it. */
function mockLessonCompleted(completed: boolean) {
  server.use(
    http.get(`${API}/progress/modules/WAT-boiling`, () =>
      HttpResponse.json({
        module_id: "WAT-boiling",
        lesson_completed: completed,
        lesson_completed_at: completed ? "2026-08-12T12:00:00Z" : null,
        quiz_attempts: 0,
        quiz_best_score: null,
        quiz_last_passed: null,
        lo_performance: [],
      }),
    ),
  );
}

describe("QuizPage — plan entitlements", () => {
  it("locks the field test for Free users until the lesson is completed", async () => {
    __setTestPlan("free");
    mockLessonCompleted(false);
    renderQuiz();

    await screen.findByText(/complete the lesson to unlock this field test/i);
    expect(screen.queryByRole("button", { name: /start field test/i })).toBeNull();
    expect(screen.getByRole("link", { name: /go to the lesson/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see plans/i })).toBeInTheDocument();
    __setTestPlan("survivor");
  });

  it("opens the field test for Free users once the lesson is completed", async () => {
    __setTestPlan("free");
    mockLessonCompleted(true);
    renderQuiz();

    await screen.findByRole("heading", { name: "Boiling Water Quiz" });
    expect(screen.getByRole("button", { name: /start field test/i })).toBeInTheDocument();
    expect(screen.queryByText(/complete the lesson to unlock/i)).toBeNull();
    __setTestPlan("survivor");
  });

  it("never locks the field test for Survivor", async () => {
    __setTestPlan("survivor");
    mockLessonCompleted(false);
    renderQuiz();

    await screen.findByRole("heading", { name: "Boiling Water Quiz" });
    expect(screen.getByRole("button", { name: /start field test/i })).toBeInTheDocument();
    expect(screen.queryByText(/complete the lesson to unlock/i)).toBeNull();
  });

  it("surfaces DAILY_QUIZ_LIMIT_REACHED inline with the reset copy", async () => {
    __setTestPlan("survivor");
    mockLessonCompleted(false);
    server.use(
      http.post(`${API}/quizzes/:quizId/attempts/:attemptId/answers`, () =>
        HttpResponse.json(
          {
            error: {
              code: "DAILY_QUIZ_LIMIT_REACHED",
              message: "You have reached your daily quiz limit. Your limit resets tomorrow.",
            },
          },
          { status: 403 },
        ),
      ),
    );
    renderQuiz();
    await screen.findByRole("heading", { name: "Boiling Water Quiz" });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /start field test/i }));
    await waitFor(() => { expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument(); });

    // Answer all three questions (radiogroups, per the real flow).
    const answers: Array<[string, RegExp]> = [
      ["Question 1", /kills all pathogens/i],
      ["Question 2", /1 minute/i],
      ["Question 3", /bacteria/i],
    ];
    for (const [group, option] of answers) {
      const g = screen.getByRole("radiogroup", { name: group });
      await user.click(within(g).getByLabelText(option));
      const next = screen.queryByRole("button", { name: /next/i });
      if (next) await user.click(next);
    }
    await user.click(screen.getByRole("button", { name: /submit field test/i }));

    await screen.findByText(/daily quiz limit reached/i);
    expect(screen.getByText(/your limit resets tomorrow/i)).toBeInTheDocument();
    __setTestPlan("survivor");
  });
});
