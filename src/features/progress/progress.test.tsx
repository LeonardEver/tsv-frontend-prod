/**
 * Progress surface tests (Phase 14 §36): authoritative rendering,
 * states, and the architecture-protecting authority test.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import ProgressPage from "./index";

const API = "*/api/v1";

function renderProgress() {
  return renderAtRoute(<ProgressPage />, "/progress");
}

async function openMissionDetails() {
  await userEvent.setup().click(screen.getByText("Mission Details", { selector: "h2" }));
}

describe("ProgressPage", () => {
  it("renders authoritative overall aggregates", async () => {
    renderProgress();
    // Academy ring: 1 of 9 modules → 11% (authoritative aggregation).
    await waitFor(() => { expect(screen.getByText("11%")).toBeInTheDocument(); });
    expect(screen.getByText("125")).toBeInTheDocument(); // XP
    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("Novice")).toBeInTheDocument(); // level 1 title
    expect(screen.getByText("2 days")).toBeInTheDocument(); // streak
  });

  it("AUTHORITY: renders progress_pct verbatim (73, not 50)", async () => {
    renderProgress();
    // The module list fixture carries progress_pct 73 while a naive
    // calculation would say 50 — the UI must never derive its own value.
    await screen.findByRole("heading", { name: "Mission Details" });
    await openMissionDetails();
    const module = await screen.findByRole("link", { name: /boiling water for purification/i });
    const bar = within(module).getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "73");
  });

  it("renders completed modules from the authoritative flag", async () => {
    renderProgress();
    await screen.findByRole("heading", { name: "Mission Details" });
    await openMissionDetails();
    const module = await screen.findByRole("link", { name: /water filtration/i });
    expect(within(module).getByText(/completed/i)).toBeInTheDocument();
  });

  it("renders authoritative per-module quiz details", async () => {
    renderProgress();
    await screen.findByRole("heading", { name: "Mission Details" });
    await openMissionDetails();
    const module = await screen.findByRole("link", { name: /boiling water for purification/i });
    await waitFor(() => { expect(within(module).getByText(/quiz: 85%/i)).toBeInTheDocument(); });
    expect(within(module).getByText(/2 attempts/i)).toBeInTheDocument();
  });

  it("uses the lesson's best quiz score rather than objective percentages", async () => {
    renderProgress();
    const lesson = await screen.findByRole("article", { name: "Lesson 1: Boiling Water for Purification" });
    expect(within(lesson).getByText("85%")).toBeInTheDocument();
    expect(within(lesson).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "85");
    expect(screen.queryByText("LO1")).not.toBeInTheDocument();
    expect(screen.queryByText("60%")).not.toBeInTheDocument();
    expect(within(lesson).getByRole("link", { name: "Review Lesson 1" })).toHaveAttribute("href", "/modules/WAT-boiling/lesson");
  });

  it("keeps real zero scores and curriculum lesson numbers for out-of-order learning", async () => {
    server.use(http.get(`${API}/progress/modules/WAT-boiling`, () => HttpResponse.json({
      module_id: "WAT-boiling", lesson_completed: true, lesson_completed_at: null,
      quiz_attempts: 1, quiz_best_score: 0, quiz_last_passed: false, lo_performance: [],
    })));
    renderProgress();
    const lesson = await screen.findByRole("article", { name: "Lesson 1: Boiling Water for Purification" });
    expect(within(lesson).getByText("0%")).toBeInTheDocument();
    expect(within(lesson).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("article", { name: "Lesson 2: Water Filtration" })).toBeInTheDocument();
  });

  it("does not renumber later lessons when an earlier lesson has no score", async () => {
    server.use(http.get(`${API}/progress/modules/WAT-boiling`, () => HttpResponse.json({
      module_id: "WAT-boiling", lesson_completed: false, lesson_completed_at: null,
      quiz_attempts: 0, quiz_best_score: null, quiz_last_passed: null, lo_performance: [],
    })));
    renderProgress();
    await screen.findByRole("article", { name: "Lesson 2: Water Filtration" });
    expect(screen.queryByRole("article", { name: /Lesson 1:/ })).not.toBeInTheDocument();
  });

  it("keeps unavailable lesson results distinct from an empty history and supports retry", async () => {
    let unavailable = true;
    server.use(http.get(`${API}/progress/modules/:moduleId`, ({ params }) =>
      unavailable ? HttpResponse.json({ error: { code: "REQUEST_ERROR", message: "Unavailable" } }, { status: 503 }) : HttpResponse.json({
        module_id: String(params.moduleId), lesson_completed: false, lesson_completed_at: null,
        quiz_attempts: 1, quiz_best_score: 58, quiz_last_passed: false, lo_performance: [],
      }),
    ));
    renderProgress();
    const panel = await screen.findByRole("region", { name: "Lesson Performance" });
    await within(panel).findByText(/some lesson results could not be loaded/i, {}, { timeout: 5000 });
    expect(within(panel).queryByText(/no lesson results yet/i)).not.toBeInTheDocument();
    unavailable = false;
    await userEvent.setup().click(within(panel).getByRole("button", { name: "Retry" }));
    const lesson = await within(panel).findByRole("article", { name: "Lesson 1: Boiling Water for Purification" });
    expect(within(lesson).getByText("58%")).toBeInTheDocument();
  });

  it("shows an empty lesson state when no performance exists", async () => {
    server.use(
      http.get(`${API}/progress/modules/:moduleId`, () =>
        HttpResponse.json({
          module_id: "x",
          lesson_completed: false,
          lesson_completed_at: null,
          quiz_attempts: 0,
          quiz_best_score: null,
          quiz_last_passed: null,
          lo_performance: [],
        }),
      ),
    );
    renderProgress();
    await waitFor(() =>
      { expect(screen.getByText(/no lesson results yet/i)).toBeInTheDocument(); },
    );
    // Missing is NOT zero: no fabricated 0% bars.
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("shows a new-user empty activity state without fake statistics", async () => {
    server.use(
      http.get(`${API}/progress`, () =>
        HttpResponse.json({
          modules_completed: 0,
          total_modules: 9,
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          recent_activity: [],
        }),
      ),
      // Nothing started → no per-module quiz scores anywhere.
      http.get(`${API}/progress/modules/:moduleId`, () =>
        HttpResponse.json({
          module_id: "x",
          lesson_completed: false,
          lesson_completed_at: null,
          quiz_attempts: 0,
          quiz_best_score: null,
          quiz_last_passed: null,
          lo_performance: [],
        }),
      ),
    );
    renderProgress();
    await waitFor(() =>
      { expect(screen.getByText(/no learning activity yet/i)).toBeInTheDocument(); },
    );
    expect(screen.getByText("0%")).toBeInTheDocument(); // authoritative zero (academy ring)
    // Missing is NOT zero: Lesson performance renders its empty state
    // instead of fabricated 0% bars.
    const loEmpty = screen.getByText(/no lesson results yet/i);
    const loSection = loEmpty.closest("section");
    if (!loSection) throw new Error("expected the lesson performance section");
    expect(loSection.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("renders the recent activity log from the server", async () => {
    renderProgress();
    await waitFor(() => { expect(screen.getByText(/quiz completed/i)).toBeInTheDocument(); });
    expect(screen.getByText(/lesson completed/i)).toBeInTheDocument();
  });

  it("shows an error state with a working retry", async () => {
    server.use(
      http.get(`${API}/progress`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderProgress();
    await waitFor(() => { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); }, {
      timeout: 5000,
    });
    server.resetHandlers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => { expect(screen.getByText("11%")).toBeInTheDocument(); });
  });

  it("handles 429 with the rate-limit copy", async () => {
    server.use(
      http.get(`${API}/progress`, () =>
        HttpResponse.json(
          { error: { code: "RATE_LIMITED", message: "Slow down" } },
          { status: 429, headers: { "Retry-After": "30" } },
        ),
      ),
    );
    renderProgress();
    await waitFor(() => { expect(screen.getByText(/too many requests/i)).toBeInTheDocument(); });
    expect(screen.getByText(/try again in about 30 seconds/i)).toBeInTheDocument();
  });

  it("navigates module rows to the module detail", async () => {
    renderProgress();
    await screen.findByRole("heading", { name: "Mission Details" });
    await openMissionDetails();
    const module = await screen.findByRole("link", { name: /boiling water for purification/i });
    expect(module).toHaveAttribute("href", "/modules/WAT-boiling");
  });

  it("renders an empty state when no modules exist", async () => {
    server.use(
      http.get(`${API}/modules`, () =>
        HttpResponse.json({
          modules: [],
          pagination: { next_cursor: null, has_more: false, page_size: 20 },
        }),
      ),
    );
    renderProgress();
    await screen.findByRole("heading", { name: "Mission Details" });
    await openMissionDetails();
    await waitFor(() => { expect(screen.getByText(/no modules available/i)).toBeInTheDocument(); });
  });
});
