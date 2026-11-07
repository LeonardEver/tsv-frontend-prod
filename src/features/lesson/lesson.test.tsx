/**
 * Lesson experience tests: structure, security boundary, section
 * navigation, completion lifecycle, the un-gated Quiz CTA and targeted
 * cache invalidation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { __setTestPlan, lessonFixture, testUser } from "@/test/msw/handlers";
import LessonPage from "./index";

const API = "*/api/v1";

function renderLesson() {
  // The default MSW session has no cookie, so /auth/me answers 401 and the
  // user id is 0 — the plan-entitlement gate then has nothing to resolve
  // against. Sign in as the shared fixture user, as the quiz tests do.
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderAtRoute(<LessonPage />, "/modules/WAT-boiling/lesson", "/modules/:moduleId/lesson");
}

beforeEach(() => {
  // jsdom has no scroll implementation; the field-manual lesson page
  // restores the server-persisted last_position via window.scrollTo.
  window.scrollTo = vi.fn();
});

describe("LessonPage", () => {
  it("renders title, learning objectives and sections", async () => {
    renderLesson();
    await waitFor(() =>
      { expect(
        screen.getByRole("heading", { name: "Boiling Water for Purification" }),
      ).toBeInTheDocument(); },
    );
    // The objectives panel renders its heading and each description (LO
    // labels are internal identifiers — not user-facing copy anymore).
    expect(screen.getByRole("heading", { name: /learning objectives/i })).toBeInTheDocument();
    expect(screen.getByText(/explain why boiling works/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the correct procedure/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recap/i })).toBeInTheDocument();
  });

  it("keeps malicious HTML inert through the markdown boundary", async () => {
    server.use(
      http.get(`${API}/lessons/WAT-boiling-L01`, () =>
        HttpResponse.json({
          ...lessonFixture,
          sections: [
            {
              type: "section",
              heading: "Danger",
              content: '<img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>\n\nSafe text.',
            },
          ],
        }),
      ),
    );
    renderLesson();
    await waitFor(() => { expect(screen.getByRole("heading", { name: "Danger" })).toBeInTheDocument(); });
    // No script anywhere in the document.
    expect(document.querySelector("script")).toBeNull();
    // The injected <img> stays literal text inside the content boundary
    // (the only <img> on the page is the category hero, which lives
    // outside the section content).
    const dangerSection = screen.getByRole("heading", { name: "Danger" }).closest("section");
    if (!dangerSection) throw new Error("expected the Danger content section");
    expect(dangerSection.querySelector("img")).toBeNull();
    expect(dangerSection.querySelector("script")).toBeNull();
    expect(screen.getByText(/safe text/i)).toBeInTheDocument();
  });

  it("drops unsafe URL schemes in lesson content", async () => {
    server.use(
      http.get(`${API}/lessons/WAT-boiling-L01`, () =>
        HttpResponse.json({
          ...lessonFixture,
          sections: [
            { type: "section", heading: "Links", content: "[good](https://example.com) [bad](javascript:alert(1))" },
          ],
        }),
      ),
    );
    renderLesson();
    await waitFor(() => { expect(screen.getByRole("heading", { name: "Links" })).toBeInTheDocument(); });
    expect(screen.getByRole("link", { name: "good" })).toHaveAttribute("href", "https://example.com");
    expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument();
  });

  it("supports keyboard-accessible section navigation via anchors", async () => {
    renderLesson();
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: /the correct procedure/i })).toBeInTheDocument(); },
    );
    const navs = screen.getAllByRole("navigation", { name: /lesson sections/i });
    const nav = navs[0];
    if (!nav) throw new Error("expected lesson section navigation");
    const target = within(nav).getByRole("link", { name: /practical application/i });
    expect(target).toHaveAttribute("href", expect.stringContaining("#lesson-section-"));
    // Anchor target exists in the DOM.
    const href = target.getAttribute("href") ?? "";
    expect(document.querySelector(href)).not.toBeNull();
    // Native anchors are keyboard-focusable.
    await userEvent.tab();
    expect(target).not.toHaveAttribute("aria-disabled");
  });

  it("renders a contextual skeleton while loading", async () => {
    server.use(
      http.get(`${API}/lessons/WAT-boiling-L01`, () => new Promise(() => {}), { once: false }),
    );
    renderLesson();
    await waitFor(() => { expect(screen.getByLabelText(/loading lesson/i)).toBeInTheDocument(); });
  });

  it("surfaces unknown lessons as not available", async () => {
    server.use(
      http.get(`${API}/modules/WAT-unknown`, () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "not found" } },
          { status: 404 },
        ),
      ),
    );
    renderAtRoute(<LessonPage />, "/modules/WAT-unknown/lesson", "/modules/:moduleId/lesson");
    await waitFor(() =>
      { expect(screen.getByText(/this content isn't available/i)).toBeInTheDocument(); },
    );
  });

  it("shows a generic error with retry for server failures", async () => {
    server.use(
      http.get(`${API}/lessons/WAT-boiling-L01`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderLesson();
    await waitFor(() => { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); }, {
      timeout: 5000,
    });

    server.resetHandlers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      { expect(
        screen.getByRole("heading", { name: "Boiling Water for Purification" }),
      ).toBeInTheDocument(); },
    );
  });

  describe("completion", () => {
    it("completes the lesson with loading and success states", async () => {
      // Representative backend semantics: the POST persists completion and
      // subsequent GETs reflect it (the real endpoint upserts progress).
      let persistComplete = false;
      let resolveComplete: (() => void) | undefined;
      server.use(
        http.get(`${API}/lessons/WAT-boiling-L01`, () =>
          HttpResponse.json({
            ...lessonFixture,
            progress: {
              completed: persistComplete,
              last_position: persistComplete ? 300 : null,
            },
          }),
        ),
        http.post(`${API}/lessons/WAT-boiling-L01/complete`, () =>
          new Promise((resolve) => {
            resolveComplete = () => {
              persistComplete = true;
              resolve(
                HttpResponse.json({
                  lesson_id: "WAT-boiling-L01",
                  completed: true,
                  completed_at: "2026-08-12T12:00:00Z",
                }),
              );
            };
          }),
        ),
      );
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument(); },
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /complete lesson/i }));
      // Loading state: the CTA disables and reads "Saving…" while the
      // POST is in flight.
      await waitFor(() =>
        { expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled(); },
      );

      resolveComplete?.();
      // Backend refetch shows completed; the CTA is replaced by the
      // "Lesson complete" state without flashing back to incomplete.
      await waitFor(() =>
        { expect(screen.getByText(/lesson complete/i)).toBeInTheDocument(); },
      );
      expect(screen.queryByRole("button", { name: /complete lesson/i })).not.toBeInTheDocument();
    });

    it("keeps the button usable after a completion failure", async () => {
      server.use(
        http.post(`${API}/lessons/WAT-boiling-L01/complete`, () =>
          HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "boom" } },
            { status: 500 },
          ),
        ),
      );
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument(); },
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /complete lesson/i }));
      // Phase 21: inline copy comes from the stable error-code map (a
      // generic 500 maps to "Something went wrong") — the quota code
      // (DAILY_LESSON_LIMIT_REACHED) gets its own copy elsewhere.
      await waitFor(() =>
        { expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i); },
      );
      const button = screen.getByRole("button", { name: /complete lesson/i });
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute("aria-busy", "true");
    });

    it("surfaces DAILY_LESSON_LIMIT_REACHED with the reset/upgrade copy", async () => {
      server.use(
        http.post(`${API}/lessons/WAT-boiling-L01/complete`, () =>
          HttpResponse.json(
            {
              error: {
                code: "DAILY_LESSON_LIMIT_REACHED",
                message: "You have reached your daily lesson limit. Your limit resets tomorrow.",
              },
            },
            { status: 403 },
          ),
        ),
      );
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument(); },
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /complete lesson/i }));
      // Phase 21 §15: the stable error code maps to the honest copy —
      // limit reached, resets tomorrow, upgrade path.
      await waitFor(() =>
        { expect(screen.getByRole("alert")).toHaveTextContent(/daily lesson limit reached/i); },
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/resets tomorrow/i);
      expect(screen.getByRole("alert")).toHaveTextContent(/upgrade to survivor/i);
    });

    it("prevents duplicate UI completion (backend remains idempotent)", async () => {
      server.use(
        http.get(`${API}/lessons/WAT-boiling-L01`, () =>
          HttpResponse.json({
            ...lessonFixture,
            progress: { completed: true, last_position: 300 },
          }),
        ),
      );
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByText(/lesson complete/i)).toBeInTheDocument(); },
      );
      // The completed state replaces the CTA entirely — there is no
      // button left to double-click (the backend stays idempotent).
      expect(screen.queryByRole("button", { name: /complete lesson/i })).not.toBeInTheDocument();
    });

    it("invalidates the module, progress and gamification caches on success", async () => {
      const moduleCalls = vi.fn();
      server.use(
        http.get(`${API}/modules/WAT-boiling`, () => {
          moduleCalls();
          return HttpResponse.json({
            module_id: "WAT-boiling",
            title: "Boiling Water for Purification",
            description: null,
            category: "water",
            subcategory: null,
            difficulty: "beginner",
            estimated_duration: 20,
            content_version: 1,
            knowledge_items: [],
            lesson: { lesson_id: "WAT-boiling-L01", title: "Lesson", estimated_minutes: 15, completed: false },
            quiz: null,
            resources: [],
            progress: { lesson_completed: false, quiz_best_score: null, completed: false },
          });
        }),
      );
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument(); },
      );
      const moduleCallsAfterLoad = moduleCalls.mock.calls.length;

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /complete lesson/i }));
      // Module detail (and progress/gamification) refetch after success.
      await waitFor(() =>
        { expect(moduleCalls.mock.calls.length).toBeGreaterThan(moduleCallsAfterLoad); },
      );
    });
  });

  describe("quiz transition", () => {
    it("keeps the field test open before completion on a plan that allows it", async () => {
      // Survivor is the mock default plan: the entitlement opens the field
      // test from the start, so the CTA is a real link.
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument(); },
      );
      const quizLink = await screen.findByRole("link", { name: /take field test/i });
      expect(quizLink).toHaveAttribute("href", "/modules/WAT-boiling/quiz");
      // Completion is still offered, directly above it.
      expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument();
    });

    it("shows the field test disabled and non-clickable while the gate is closed", async () => {
      // Free plan + this module's lesson not completed: the same rule the
      // quiz page enforces.
      __setTestPlan("free");
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument(); },
      );

      const disabledCta = await screen.findByRole("button", { name: /take field test/i });
      expect(disabledCta).toBeDisabled();
      // Renderable, but not a link — there is no route to the quiz from here
      // until the backend reports the lesson done.
      expect(screen.queryByRole("link", { name: /take field test/i })).toBeNull();
      expect(screen.getByText(/complete the lesson above to unlock the field test/i)).toBeInTheDocument();
      // The completion action it depends on is right there.
      expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument();
    });

    it("opens the field test CTA once the lesson is completed", async () => {
      __setTestPlan("free");
      server.use(
        // The backend reports the lesson completed (the lesson AND the
        // per-module progress resource the gate reads).
        http.get(`${API}/lessons/WAT-boiling-L01`, () =>
          HttpResponse.json({
            ...lessonFixture,
            progress: { completed: true, last_position: 300 },
          }),
        ),
        http.get(`${API}/progress/modules/WAT-boiling`, () =>
          HttpResponse.json({
            module_id: "WAT-boiling",
            lesson_completed: true,
            lesson_completed_at: "2026-08-12T12:00:00Z",
            quiz_attempts: 0,
            quiz_best_score: null,
            quiz_last_passed: null,
            lo_performance: [],
          }),
        ),
      );
      renderLesson();
      await waitFor(() => { expect(screen.getByText(/lesson complete/i)).toBeInTheDocument(); });

      const quizLink = await screen.findByRole("link", { name: /take field test/i });
      expect(quizLink).toHaveAttribute("href", "/modules/WAT-boiling/quiz");
      expect(screen.queryByRole("button", { name: /take field test/i })).toBeNull();
    });

    it("opens the field test CTA immediately after completing the lesson", async () => {
      // The Free-plan flow end to end: locked → Complete lesson → open.
      __setTestPlan("free");
      let lessonDone = false;
      server.use(
        http.post(`${API}/lessons/WAT-boiling-L01/complete`, () => {
          lessonDone = true;
          return HttpResponse.json({
            lesson_id: "WAT-boiling-L01",
            completed: true,
            completed_at: "2026-08-12T12:00:00Z",
          });
        }),
        http.get(`${API}/lessons/WAT-boiling-L01`, () =>
          HttpResponse.json({
            ...lessonFixture,
            progress: { completed: lessonDone, last_position: null },
          }),
        ),
        http.get(`${API}/progress/modules/WAT-boiling`, () =>
          HttpResponse.json({
            module_id: "WAT-boiling",
            lesson_completed: lessonDone,
            lesson_completed_at: lessonDone ? "2026-08-12T12:00:00Z" : null,
            quiz_attempts: 0,
            quiz_best_score: null,
            quiz_last_passed: null,
            lo_performance: [],
          }),
        ),
      );
      renderLesson();
      await waitFor(() =>
        { expect(screen.getByRole("button", { name: /complete lesson/i })).toBeInTheDocument(); },
      );
      expect(await screen.findByRole("button", { name: /take field test/i })).toBeDisabled();

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /complete lesson/i }));

      // After the authoritative refetch the CTA is a working link.
      const quizLink = await screen.findByRole("link", { name: /take field test/i });
      expect(quizLink).toHaveAttribute("href", "/modules/WAT-boiling/quiz");
      expect(screen.queryByRole("button", { name: /take field test/i })).toBeNull();
    });
  });
});
