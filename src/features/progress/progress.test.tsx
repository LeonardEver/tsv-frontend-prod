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
    const module = await screen.findByRole("link", { name: /boiling water for purification/i });
    const bar = within(module).getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "73");
  });

  it("renders completed modules from the authoritative flag", async () => {
    renderProgress();
    const module = await screen.findByRole("link", { name: /water filtration/i });
    expect(within(module).getByText(/completed/i)).toBeInTheDocument();
  });

  it("renders authoritative per-module quiz details", async () => {
    renderProgress();
    const module = await screen.findByRole("link", { name: /boiling water for purification/i });
    await waitFor(() => { expect(within(module).getByText(/quiz: 85%/i)).toBeInTheDocument(); });
    expect(within(module).getByText(/2 attempts/i)).toBeInTheDocument();
  });

  it("renders authoritative LO performance (85% and 60%)", async () => {
    renderProgress();
    await waitFor(() => { expect(screen.getByText("LO1")).toBeInTheDocument(); });
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("shows an empty LO state when no performance exists", async () => {
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
      { expect(screen.getByText(/no objective performance yet/i)).toBeInTheDocument(); },
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
      // Nothing started → no per-module LO performance anywhere.
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
    // Missing is NOT zero: LO performance renders its empty state
    // instead of fabricated 0% bars.
    const loEmpty = screen.getByText(/no objective performance yet/i);
    const loSection = loEmpty.closest("section");
    if (!loSection) throw new Error("expected the LO performance section");
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
    await waitFor(() => { expect(screen.getByText(/no modules available/i)).toBeInTheDocument(); });
  });
});
