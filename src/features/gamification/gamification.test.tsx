/**
 * Gamification surface tests (Phase 14 §37): authoritative XP/level/
 * streak/achievements, locked-without-progress rendering, empty and
 * error states — and the no-frontend-calculation authority rule.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import GamificationPage from "./index";

const API = "*/api/v1";

function renderGamification() {
  return renderAtRoute(<GamificationPage />, "/gamification");
}

describe("GamificationPage", () => {
  it("renders authoritative XP, level and next-level values", async () => {
    renderGamification();
    await waitFor(() => { expect(screen.getByText("125")).toBeInTheDocument(); });
    // Level and title are rendered textually in the hero — no invented
    // progression ring or bar is drawn.
    expect(screen.getByRole("heading", { name: "Novice" })).toBeInTheDocument();
    expect(screen.getByText("LVL 1")).toBeInTheDocument();
    // No invented progression curve — the backend exposes no level
    // threshold, so the UI shows the raw "XP to next level" value only.
    expect(screen.getByText(/175 xp toward level 2/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: /xp to the next level/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the authoritative streak without local calculation", async () => {
    renderGamification();
    await waitFor(() => { expect(screen.getByText("2 days")).toBeInTheDocument(); });
    expect(screen.getByText(/personal best: 2 days/i)).toBeInTheDocument();
  });

  it("renders earned achievements with the unlock date", async () => {
    renderGamification();
    await waitFor(() =>
      { expect(screen.getByText(/first water module/i)).toBeInTheDocument(); },
    );
    // The card carries the backend unlock date — "Earned <date>", never
    // a static badge.
    const earned = screen.getByText(/^earned/i);
    expect(earned).toHaveTextContent("2026");
  });

  it("renders locked achievements with authoritative progress only", async () => {
    renderGamification();
    await waitFor(() => { expect(screen.getByText(/lesson scholar/i)).toBeInTheDocument(); });
    // Progress provided by the backend (pct 20) → rendered on the bar.
    const bar = screen.getByRole("progressbar", { name: /lesson scholar/i });
    expect(bar).toHaveAttribute("aria-valuenow", "20");
  });

  it("renders locked WITHOUT progress as Not earned — never a fabricated bar", async () => {
    renderGamification();
    await waitFor(() => { expect(screen.getByText(/week warrior/i)).toBeInTheDocument(); });
    // The fixture deliberately omits progress for week_warrior: the card
    // shows the honest "Not earned" state, and no bar exists for it.
    const weekWarriorCard = screen.getByText(/week warrior/i).closest(".panel-2") as HTMLElement | null;
    expect(weekWarriorCard).not.toBeNull();
    if (!weekWarriorCard) throw new Error("Week warrior card not found");
    expect(within(weekWarriorCard).getByText("Not earned")).toBeInTheDocument();
    expect(within(weekWarriorCard).queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders the XP transaction history from the server", async () => {
    renderGamification();
    await waitFor(() => { expect(screen.getByText(/quiz passed/i)).toBeInTheDocument(); });
    expect(screen.getByText(/\+75 XP/i)).toBeInTheDocument();
  });

  it("shows an empty state when no achievements exist", async () => {
    server.use(
      http.get(`${API}/gamification/achievements`, () =>
        HttpResponse.json({ earned: [], unearned: [] }),
      ),
    );
    renderGamification();
    await waitFor(() =>
      { expect(screen.getByText(/your achievements will appear here/i)).toBeInTheDocument(); },
    );
  });

  it("shows an empty XP history state for a new user", async () => {
    server.use(
      http.get(`${API}/gamification`, () =>
        HttpResponse.json({
          total_xp: 0,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 300,
          current_streak: 0,
          longest_streak: 0,
          achievements_earned: 0,
          recent_transactions: [],
        }),
      ),
    );
    renderGamification();
    await waitFor(() => { expect(screen.getByText(/no xp earned yet/i)).toBeInTheDocument(); });
  });

  it("shows an error state with a working retry", async () => {
    server.use(
      http.get(`${API}/gamification`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderGamification();
    await waitFor(() => { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); }, {
      timeout: 5000,
    });
    server.resetHandlers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => { expect(screen.getByText("125")).toBeInTheDocument(); });
  });
});
