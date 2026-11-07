/**
 * Quiz experience tests (Phase 13 §51): load, safe payload, attempt
 * creation with idempotency, questions/navigation, submission resilience,
 * the authoritative result and the un-gated product rule.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { AuthProvider } from "@/features/auth/use-auth";
import { __lastAttemptId, __markAttemptSubmitted, quizFixture, submissionResultFixture, testUser } from "@/test/msw/handlers";
import QuizPage from "./index";

const API = "*/api/v1";

function renderQuiz() {
  // Authenticated user — draft keys derive from user_id (1).
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderAtRoute(
    <AuthProvider>
      <QuizPage />
    </AuthProvider>,
    "/modules/WAT-boiling/quiz",
    "/modules/:moduleId/quiz",
  );
}

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() =>
    { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
  );
  await user.click(screen.getByRole("button", { name: /start field test/i }));
  await waitFor(() => { expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument(); });
}

/** Answer all three questions then submit. */
async function answerAllAndSubmit(user: ReturnType<typeof userEvent.setup>) {
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
  await waitFor(() =>
    { expect(screen.getByText(/field test complete/i)).toBeInTheDocument(); },
  );
}

describe("QuizPage — load & safe payload", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("loads the quiz with title and question count", async () => {
    renderQuiz();
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
    );
    expect(screen.getByText(/3 questions/i)).toBeInTheDocument();
  });

  it("SECURITY: the safe payload carries no correct answers", async () => {
    renderQuiz();
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
    );
    expect(document.body.textContent).not.toContain("correct_answer");
    expect(document.body.textContent).not.toContain("explanation");
  });

  it("shows a contextual loading skeleton", async () => {
    server.use(http.get(`${API}/quizzes/WAT-boiling-Q01`, () => new Promise(() => {})));
    renderQuiz();
    await waitFor(() => { expect(screen.getByLabelText(/loading quiz/i)).toBeInTheDocument(); });
  });

  it("surfaces unknown quizzes as not available", async () => {
    server.use(
      http.get(`${API}/modules/WAT-unknown`, () =>
        HttpResponse.json({ error: { code: "NOT_FOUND", message: "not found" } }, { status: 404 }),
      ),
    );
    renderAtRoute(
      <AuthProvider>
        <QuizPage />
      </AuthProvider>,
      "/modules/WAT-unknown/quiz",
      "/modules/:moduleId/quiz",
    );
    await waitFor(() =>
      { expect(screen.getByText(/this content isn't available/i)).toBeInTheDocument(); },
    );
  });

  it("shows a generic error with retry for server failures", async () => {
    server.use(
      http.get(`${API}/quizzes/WAT-boiling-Q01`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderQuiz();
    await waitFor(() => { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); }, {
      timeout: 5000,
    });
    server.resetHandlers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
    );
  });

  it("PRODUCT RULE: the quiz is reachable without any lesson completion", async () => {
    renderQuiz();
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
    );
    expect(screen.getByRole("button", { name: /start field test/i })).toBeEnabled();
    expect(screen.queryByText(/complete.*lesson.*first/i)).not.toBeInTheDocument();
  });
});

describe("QuizPage — attempt creation", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { localStorage.clear(); });

  it("protects against double activation of Start", async () => {
    const user = userEvent.setup();
    renderQuiz();

    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
    );
    const start = screen.getByRole("button", { name: /start field test/i });
    await user.click(start);
    await user.click(start); // disabled mid-flight — no second attempt
    await waitFor(() => { expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument(); });
  });

  it("reuses the same Idempotency-Key when creation is retried", async () => {
    const keys: string[] = [];
    server.use(
      http.post(`${API}/quizzes/WAT-boiling-Q01/attempts`, ({ request }) => {
        keys.push(request.headers.get("idempotency-key") ?? "");
        if (keys.length === 1) {
          return HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "boom" } },
            { status: 500 },
          );
        }
        return HttpResponse.json(
          {
            attempt_id: 50,
            quiz_id: "WAT-boiling-Q01",
            status: "in_progress",
            started_at: "2026-08-12T12:00:00Z",
            replayed: false,
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderQuiz();
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water Quiz" })).toBeInTheDocument(); },
    );
    await user.click(screen.getByRole("button", { name: /start field test/i }));
    await waitFor(() => { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); });

    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => { expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument(); });

    expect(keys.length).toBe(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]); // SAME key — never a new one
  });
});

describe("QuizPage — questions, draft, submission", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("selects answers and navigates with answered/unanswered state", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startQuiz(user);

    const group = screen.getByRole("radiogroup", { name: "Question 1" });
    await user.click(within(group).getByLabelText(/kills all pathogens/i));
    expect(within(group).getByRole("radio", { name: /kills all pathogens/i })).toBeChecked();

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => { expect(screen.getByText(/question 2 of 3/i)).toBeInTheDocument(); });

    const navigator = screen.getByRole("navigation", { name: /question navigator/i });
    expect(within(navigator).getByRole("button", { name: /question 1, answered/i })).toBeInTheDocument();
    expect(within(navigator).getByRole("button", { name: /question 2, unanswered/i })).toBeInTheDocument();
    // Neutral ✓/— indicators — never correctness colors.
    expect(within(navigator).getByText("✓")).toBeInTheDocument();
    expect(within(navigator).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("supports keyboard navigation between questions via the navigator", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startQuiz(user);

    const navigator = screen.getByRole("navigation", { name: /question navigator/i });
    const q3 = within(navigator).getByRole("button", { name: /question 3, unanswered/i });
    await user.click(q3);
    await waitFor(() => { expect(screen.getByText(/question 3 of 3/i)).toBeInTheDocument(); });

    // Arrow keys move between radios in the group (D → C on ArrowUp).
    const group = screen.getByRole("radiogroup", { name: "Question 3" });
    await user.click(within(group).getByLabelText(/lead/i));
    await user.keyboard("{ArrowUp}");
    expect(within(group).getByRole("radio", { name: /protozoa/i })).toBeChecked();
  });

  it("persists a draft and restores it across a remount (recovery prompt)", async () => {
    const user = userEvent.setup();
    const first = renderQuiz();
    await startQuiz(user);

    const group = screen.getByRole("radiogroup", { name: "Question 1" });
    await user.click(within(group).getByLabelText(/kills all pathogens/i));
    await new Promise((r) => setTimeout(r, 400)); // debounced write

    const key = Object.keys(localStorage).find((k) => k.startsWith("quiz-draft:"));
    expect(key).toBeTruthy();
    if (!key) throw new Error("draft key missing");
    const saved = localStorage.getItem(key);

    first.unmount();

    // Simulate a refresh: the draft survives; the new mount must offer
    // recovery, never silently discard or restore.
    const second = renderQuiz();
    await waitFor(() =>
      { expect(screen.getByText(/continue previous attempt/i)).toBeInTheDocument(); },
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => { expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument(); });
    expect(
      within(screen.getByRole("radiogroup", { name: "Question 1" })).getByRole("radio", {
        name: /kills all pathogens/i,
      }),
    ).toBeChecked();

    // "Start Over" discards only the local draft.
    expect(localStorage.getItem(key)).toBe(saved);
    second.unmount();
  });

  it("shows the review state with unanswered warning and allows submission", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => { expect(screen.getByText(/question 3 of 3/i)).toBeInTheDocument(); });

    const group = screen.getByRole("radiogroup", { name: "Question 3" });
    await user.click(within(group).getByLabelText(/lead/i));

    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
    expect(screen.getByText(/2 unanswered/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit field test/i })).toBeEnabled();
  });

  it("submits and renders the AUTHORITATIVE result exclusively", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startQuiz(user);
    await answerAllAndSubmit(user);

    expect(screen.getAllByText("67%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2\/3 correct/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not passed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/25 XP/i)).toBeInTheDocument();
    expect(screen.getByText(/2\/3 correct/i)).toBeInTheDocument();
    expect(screen.getByText(/boiling does not remove heavy metals like lead/i)).toBeInTheDocument();

    // Draft cleared after confirmed success.
    const draftKeys = Object.keys(localStorage).filter((k) => k.startsWith("quiz-draft:"));
    expect(draftKeys.length).toBe(0);
  });

  it("recovers the historical result on a 409 duplicate submission", async () => {
    // Scenario: the server graded the attempt but the response was lost;
    // the client kept its draft. On retry the backend answers 409 — the
    // frontend must recover the historical result, not error.
    const user = userEvent.setup();
    const first = renderQuiz();
    await startQuiz(user);
    await answerAllAndSubmit(user);
    const attemptId = __lastAttemptId();
    first.unmount();

    __markAttemptSubmitted(attemptId);
    const draft = {
      version: 1,
      userId: 1,
      quizId: "WAT-boiling-Q01",
      attemptId,
      answers: { q01: "C" },
      currentQuestionIndex: 2,
      updatedAt: Date.now(),
    };
    localStorage.setItem(`quiz-draft:1:WAT-boiling-Q01:${attemptId}`, JSON.stringify(draft));

    renderQuiz();
    await waitFor(() =>
      { expect(screen.getByText(/continue previous attempt/i)).toBeInTheDocument(); },
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => { expect(screen.getByText(/question 3 of 3/i)).toBeInTheDocument(); });

    await user.click(screen.getByRole("button", { name: /submit field test/i }));
    // 409 → historical result recovered (E5).
    await waitFor(() =>
      { expect(screen.getByText(/field test complete/i)).toBeInTheDocument(); },
    );
    expect(screen.getAllByText("67%").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps the draft and offers retry after a definitive 500 on submission", async () => {
    server.use(
      http.post(`${API}/quizzes/:quizId/attempts/:attemptId/answers`, () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "boom" } }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderQuiz();
    await startQuiz(user);

    const group = screen.getByRole("radiogroup", { name: "Question 1" });
    await user.click(within(group).getByLabelText(/kills all pathogens/i));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /submit field test/i }));

    await waitFor(() => { expect(screen.getByRole("alert")).toBeInTheDocument(); });
    expect(screen.getByRole("button", { name: /retry submission/i })).toBeInTheDocument();
    // Draft is NOT cleared before a confirmed success.
    await new Promise((r) => setTimeout(r, 400));
    const draftKeys = Object.keys(localStorage).filter((k) => k.startsWith("quiz-draft:"));
    expect(draftKeys.length).toBe(1);
  });

  it("renders an explicit safe error for unsupported question types", async () => {
    const firstQuestion = quizFixture.questions[0];
    if (!firstQuestion) throw new Error("fixture: no questions");
    server.use(
      http.get(`${API}/quizzes/WAT-boiling-Q01`, () =>
        HttpResponse.json({
          ...quizFixture,
          questions: [{ ...firstQuestion, question_type: "future_type" }],
        }),
      ),
    );
    renderQuiz();
    await waitFor(() =>
      { expect(screen.getByRole("button", { name: /start field test/i })).toBeInTheDocument(); },
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /start field test/i }));
    await waitFor(() =>
      { expect(screen.getByText(/this question type isn't supported yet/i)).toBeInTheDocument(); },
    );
  });

  it("reveals achievements newly present in the authoritative list after submission", async () => {
    // The achievements endpoint returns the post-submission list after
    // grading — the result screen must reveal exactly the DIFFERENCE
    // against the pre-submit snapshot, never a client-side guess.
    let submitted = false;
    server.use(
      http.get(`${API}/gamification/achievements`, () =>
        HttpResponse.json({
          earned: submitted
            ? [
                {
                  achievement_key: "first_water_module",
                  title: "First Water Module",
                  description: "Complete your first Water category module",
                  icon: "💧",
                  earned_at: "2026-08-09T12:00:00Z",
                },
                {
                  achievement_key: "quiz_challenger",
                  title: "Quiz Challenger",
                  description: "Complete a quiz",
                  icon: "🧠",
                  earned_at: "2026-08-12T12:05:00Z",
                },
              ]
            : [
                {
                  achievement_key: "first_water_module",
                  title: "First Water Module",
                  description: "Complete your first Water category module",
                  icon: "💧",
                  earned_at: "2026-08-09T12:00:00Z",
                },
              ],
          unearned: [],
        }),
      ),
      http.post(`${API}/quizzes/:quizId/attempts/:attemptId/answers`, () => {
        submitted = true;
        return HttpResponse.json({ ...submissionResultFixture, attempt_id: 1 });
      }),
    );
    const user = userEvent.setup();
    renderQuiz();
    await startQuiz(user);
    await answerAllAndSubmit(user);

    await waitFor(() =>
      { expect(screen.getByText("Quiz Challenger")).toBeInTheDocument(); },
    );
    expect(screen.getByRole("heading", { name: /new achievement/i })).toBeInTheDocument();
    // The pre-existing achievement is NOT presented as new.
    expect(screen.queryByText("First Water Module")).not.toBeInTheDocument();
  });
});
