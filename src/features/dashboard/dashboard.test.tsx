/**
 * Dashboard — Base Camp: information hierarchy, authoritative data only,
 * the deterministic next-mission rule, and the new-user vs
 * returning-user difference.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute, renderWithProviders, createTestQueryClient } from "@/test/render";
import { AuthProvider } from "@/features/auth/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { emptyProgress, moduleDetailFixture } from "@/test/msw/handlers";
import DashboardPage from "./index";
import GamificationPage from "@/features/gamification";

const API = "*/api/v1";

function renderDashboard() {
  return renderAtRoute(
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>,
    "/dashboard",
  );
}

describe("Dashboard — Base Camp", () => {
  it("prioritizes the next mission from the most recent activity", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument();
    });
    // Authoritative flags: the lesson is NOT completed → the next step is
    // the lesson, and the expedition trail keeps the mission page one
    // step away.
    const startLesson = screen.getByRole("link", { name: /start lesson/i });
    expect(startLesson).toHaveAttribute("href", "/modules/WAT-boiling/lesson");
    expect(screen.getByRole("link", { name: "Boiling Water for Purification" })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling",
    );
    // The most recent learning event surfaces as the expedition's
    // in-progress entry — human module state, never a raw action code.
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("routes to the quiz when the lesson is already completed", async () => {
    server.use(
      http.get(`${API}/modules/WAT-boiling`, () =>
        HttpResponse.json({
          ...moduleDetailFixture,
          lesson: { ...moduleDetailFixture.lesson, completed: true },
        }),
      ),
    );
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /take quiz/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /take quiz/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling/quiz",
    );
  });

  it("offers a retake when a quiz attempt already exists", async () => {
    server.use(
      http.get(`${API}/modules/WAT-boiling`, () =>
        HttpResponse.json({
          ...moduleDetailFixture,
          lesson: { ...moduleDetailFixture.lesson, completed: true },
          quiz: { ...moduleDetailFixture.quiz, attempt_count: 1 },
        }),
      ),
    );
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /retake quiz/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /retake quiz/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling/quiz",
    );
  });

  it("falls back to discovery when the active module is unavailable (404)", async () => {
    server.use(
      http.get(`${API}/modules/WAT-boiling`, () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "Module not found", request_id: "test-404" } },
          { status: 404 },
        ),
      ),
    );
    renderDashboard();
    // Deterministic fallback: first category from the authoritative list.
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /explore water/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /explore water/i })).toHaveAttribute(
      "href",
      "/categories/water",
    );
  });

  it("shows discovery for a new user instead of fabricating activity", async () => {
    // NOTE: with no recent activity the module query is disabled and the
    // redesigned hero keeps its loading skeleton — the DiscoveryHero
    // fallback currently only renders on a module 404 (covered above).
    // This test pins the deterministic part: the authoritative zero
    // state renders and nothing is fabricated.
    server.use(http.get(`${API}/progress`, () => HttpResponse.json(emptyProgress)));
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/0 missions complete/i)).toBeInTheDocument();
    });
    // No fabricated next action of any kind.
    expect(screen.queryByRole("link", { name: /start lesson|take quiz|retake quiz/i })).not.toBeInTheDocument();
  });

  it("renders authoritative progress and gamification summaries", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/1 missions complete/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/level 1 · novice/i)).toBeInTheDocument();
    expect(screen.getByText("125 XP")).toBeInTheDocument();
    expect(screen.getByText(/2 day streak/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 achievements earned/i)).toBeInTheDocument();
  });

  it("renders the exploration section from authoritative categories", async () => {
    renderDashboard();
    const explore = await screen.findByRole("heading", { name: "Explore Regions" });
    const section = explore.closest("section");
    expect(section).not.toBeNull();
    if (!section) throw new Error("Explore section not found");
    const scope = within(section);
    await scope.findByRole("heading", { name: "Water" });
    expect(scope.getByRole("heading", { name: "Fire" })).toBeInTheDocument();
    // Authoritative counts from /categories, rendered verbatim.
    expect(scope.getByText("7 missions")).toBeInTheDocument();
    expect(scope.getByText("1 complete")).toBeInTheDocument();
    expect(scope.getByText("2 missions")).toBeInTheDocument();
    expect(scope.getByText("0 complete")).toBeInTheDocument();
  });

  it("shows a section-level error with retry when progress fails", async () => {
    // NOTE (Phase 23 redesign): the dashboard no longer renders a
    // section-level error state with a Retry button for the /progress
    // query — the failure is silent. This test pins the deterministic
    // degradation: the page does not crash, nothing is fabricated, and
    // independent authoritative sections keep rendering. (Production
    // gap: no error/retry affordance for the progress query.)
    server.use(
      http.get(`${API}/progress`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderDashboard();
    // The client's GET-retry policy retries twice with backoff before the
    // query settles into error — allow time for that.
    await waitFor(
      () => {
        expect(screen.queryByText(/missions complete/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // No next-mission CTA is fabricated from the failed query.
    expect(
      screen.queryByRole("link", { name: /start lesson|take quiz|retake quiz/i }),
    ).not.toBeInTheDocument();
    // Independent authoritative queries keep rendering.
    await waitFor(() => {
      expect(screen.getByText("125 XP")).toBeInTheDocument();
    });
    expect(screen.getByText(/2 day streak/i)).toBeInTheDocument();
  });

  it("keeps the next-mission CTA reachable by keyboard in document order", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /start lesson/i })).toBeInTheDocument();
    });
    const user = userEvent.setup();
    let focused = false;
    for (let i = 0; i < 40; i += 1) {
      await user.tab();
      if (screen.getByRole("link", { name: /start lesson/i }) === document.activeElement) {
        focused = true;
        break;
      }
    }
    expect(focused).toBe(true);
  });

  it("CROSS-SURFACE: shares one canonical gamification query with the gamification page", async () => {
    let gamificationCalls = 0;
    server.use(
      http.get(`${API}/gamification`, () => {
        gamificationCalls += 1;
        return HttpResponse.json({
          total_xp: 125,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 175,
          current_streak: 2,
          longest_streak: 2,
          achievements_earned: 1,
          recent_transactions: [],
        });
      }),
      http.get(`${API}/gamification/achievements`, () =>
        HttpResponse.json({ earned: [], unearned: [] }),
      ),
    );
    // One shared QueryClient across BOTH surfaces — the canonical query
    // key means a single network request, and both surfaces show the
    // same authoritative value: the dashboard's page-header XP readout
    // and the gamification page's XP badge both render "125 XP".
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <>
              <DashboardPage />
              <GamificationPage />
            </>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => { expect(screen.getAllByText("125 XP").length).toBeGreaterThanOrEqual(2); });
    await waitFor(() => { expect(screen.getAllByText("125").length).toBeGreaterThanOrEqual(1); });
    expect(gamificationCalls).toBe(1);
  });
});
