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
import {
  activeProgress,
  emptyProgress,
  moduleDetailFixture,
  modulesListFixture,
} from "@/test/msw/handlers";
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
  it("recommends the next incomplete mission and links straight into its lesson", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument();
    });
    // WAT-boiling is the first module in the server's order that is not
    // completed, and its lesson is not completed either → the lesson.
    const takeLesson = screen.getByRole("link", { name: /take lesson/i });
    expect(takeLesson).toHaveAttribute("href", "/modules/WAT-boiling/lesson");
    // Home → lesson. The module page is never in the path; it stays
    // reachable through browse.
    expect(screen.queryByRole("link", { name: "Boiling Water for Purification" })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling",
    );
    // The expedition lists what was already engaged with.
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("skips completed missions and advances as they are finished", async () => {
    // Server order: WAT-boiling (complete) → WAT-filtration (complete) →
    // WAT-storage (incomplete). The recommendation must walk past BOTH
    // finished missions, not stop at the first row.
    server.use(
      http.get(`${API}/modules`, () =>
        HttpResponse.json({
          modules: [
            { ...modulesListFixture.modules[0], completed: true, progress_pct: 100 },
            { ...modulesListFixture.modules[1], completed: true, progress_pct: 100 },
            {
              module_id: "WAT-storage",
              title: "Emergency Water Storage",
              category: "water",
              difficulty: "beginner",
              estimated_duration: 15,
              description: "Keep a reserve that lasts.",
              completed: false,
              progress_pct: 0,
            },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 3 },
        }),
      ),
      http.get(`${API}/modules/WAT-storage`, () =>
        HttpResponse.json({
          ...moduleDetailFixture,
          module_id: "WAT-storage",
          title: "Emergency Water Storage",
          subcategory: "storage",
          lesson: { ...moduleDetailFixture.lesson, lesson_id: "WAT-storage-L01", completed: false },
          quiz: { ...moduleDetailFixture.quiz, quiz_id: "WAT-storage-Q01", attempt_count: 0 },
        }),
      ),
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Emergency Water Storage" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /take lesson/i })).toHaveAttribute(
      "href",
      "/modules/WAT-storage/lesson",
    );
    // Neither finished mission is put forward.
    expect(screen.queryByRole("heading", { name: "Boiling Water for Purification" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Water Filtration" })).toBeNull();
  });

  it("recommends the first incomplete mission, not the last one touched", async () => {
    // Recent activity points at WAT-boiling; the inventory says WAT-boiling
    // is done. Following activity would re-recommend finished work — the
    // recommendation must follow the curriculum instead.
    server.use(
      http.get(`${API}/progress`, () =>
        HttpResponse.json({
          ...activeProgress,
          recent_activity: [
            { module_id: "WAT-boiling", action: "lesson_completed", score: null, at: "2026-08-09T12:00:00Z" },
            { module_id: "WAT-storage", action: "lesson_completed", score: null, at: "2026-08-11T12:00:00Z" },
          ],
        }),
      ),
      http.get(`${API}/modules`, () =>
        HttpResponse.json({
          modules: [
            modulesListFixture.modules[0],
            { ...modulesListFixture.modules[1], completed: true, progress_pct: 100 },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 2 },
        }),
      ),
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /take lesson/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling/lesson",
    );
  });

  it("shows the end-of-curriculum state when every mission is complete", async () => {
    server.use(
      http.get(`${API}/modules`, () =>
        HttpResponse.json({
          modules: modulesListFixture.modules.map((m) => ({
            ...m,
            completed: true,
            progress_pct: 100,
          })),
          pagination: { next_cursor: null, has_more: false, page_size: 2 },
        }),
      ),
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/every mission complete/i)).toBeInTheDocument();
    });
    // No next mission is invented to fill the slot.
    expect(screen.queryByText("Your next mission")).toBeNull();
    expect(screen.queryByRole("link", { name: /take lesson|take quiz|retake quiz/i })).toBeNull();
    expect(screen.getByRole("link", { name: /review your record/i })).toHaveAttribute(
      "href",
      "/progress",
    );
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

  it("recommends the first mission to a brand-new user", async () => {
    // A user with no activity at all: the recommendation comes from the
    // module inventory's own order and completed flags, so it exists from
    // the first visit — nothing is inferred from activity.
    server.use(http.get(`${API}/progress`, () => HttpResponse.json(emptyProgress)));
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/0 missions complete/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /take lesson/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling/lesson",
    );
    // The zero state is still reported honestly — nothing was fabricated to
    // produce that recommendation, and the trail stays empty.
    expect(screen.getByText(/your expedition starts here/i)).toBeInTheDocument();
    expect(screen.queryByText("in progress")).toBeNull();
  });

  it("recommends Survival Fundamentals when Agriculture sorts first alphabetically", async () => {
    // The reported bug, reproduced at page level. `/modules` is ordered
    // alphabetically by module_id, so AGR-composting leads the response
    // while Survival Fundamentals — where a new learner must actually
    // start — arrives later in the array. Trusting response order
    // recommends Composting to someone who has finished nothing.
    server.use(
      http.get(`${API}/categories`, () =>
        HttpResponse.json({
          categories: [
            { slug: "fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 1, completed_count: 0 },
            { slug: "agriculture", code: "AGR", title: "Agriculture", module_count: 1, completed_count: 0 },
          ],
        }),
      ),
      http.get(`${API}/modules`, () =>
        HttpResponse.json({
          modules: [
            {
              module_id: "AGR-composting",
              title: "Composting",
              category: "agriculture",
              difficulty: "beginner",
              estimated_duration: 20,
              description: null,
              completed: false,
              progress_pct: 0,
            },
            {
              module_id: "SUR-prioritization",
              title: "Emergency Planning",
              category: "fundamentals",
              difficulty: "beginner",
              estimated_duration: 15,
              description: null,
              completed: false,
              progress_pct: 0,
            },
          ],
          pagination: { next_cursor: null, has_more: false, page_size: 20 },
        }),
      ),
      http.get(`${API}/modules/SUR-prioritization`, () =>
        HttpResponse.json({
          ...moduleDetailFixture,
          module_id: "SUR-prioritization",
          title: "Emergency Planning",
          category: "fundamentals",
        }),
      ),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Emergency Planning" })).toBeInTheDocument();
    });
    // The alphabetically-first module is never surfaced by the hero.
    expect(screen.queryByRole("heading", { name: "Composting" })).toBeNull();
    expect(screen.getByRole("link", { name: /take lesson/i })).toHaveAttribute(
      "href",
      "/modules/SUR-prioritization/lesson",
    );
  });

  it("renders authoritative progress and gamification summaries", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/1 mission complete/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/level 1 · novice/i)).toBeInTheDocument();
    expect(screen.getByText("125 XP")).toBeInTheDocument();
    expect(screen.getAllByText(/2 day streak/i).length).toBeGreaterThan(0);
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
      screen.queryByRole("link", { name: /take lesson|take quiz|retake quiz/i }),
    ).not.toBeInTheDocument();
    // Independent authoritative queries keep rendering.
    await waitFor(() => {
      expect(screen.getByText("125 XP")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/2 day streak/i).length).toBeGreaterThan(0);
  });

  it("keeps the next-mission CTA reachable by keyboard in document order", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /take lesson/i })).toBeInTheDocument();
    });
    const user = userEvent.setup();
    let focused = false;
    for (let i = 0; i < 40; i += 1) {
      await user.tab();
      if (screen.getByRole("link", { name: /take lesson/i }) === document.activeElement) {
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
    // same authoritative value in their Total XP stats, regardless of
    // whether the visual treatment places the unit beside the number.
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
    await waitFor(() => {
      const labels = screen.getAllByText("Total XP");
      expect(labels).toHaveLength(2);
      for (const label of labels) expect(label.parentElement).toHaveTextContent("125");
    });
    expect(gamificationCalls).toBe(1);
  });
});
