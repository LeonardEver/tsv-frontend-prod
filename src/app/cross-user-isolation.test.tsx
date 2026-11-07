/**
 * CROSS-USER CACHE ISOLATION — release-blocking security test
 * (Phase 15 §42).
 *
 * User A: login → load profile/progress/gamification → create a quiz
 * draft → logout.
 * User B: login — must see NONE of User A's data: no profile, no
 * progress, no XP/achievements, no quiz draft.
 *
 * The application must not rely on a browser refresh for isolation.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders, createTestQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "@/features/auth/use-auth";
import { readDraftForQuiz, saveDraft } from "@/features/quiz/draft";
import { DRAFT_VERSION } from "@/features/quiz/draft";
import { UserMenu } from "@/components/layout/UserMenu";
import ProfilePage from "@/features/profile";

const API = "*/api/v1";

const userA = {
  user_id: 1,
  email: "alice@example.com",
  display_name: "Alice",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};
const userB = {
  user_id: 2,
  email: "bob@example.com",
  display_name: "Bob",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

function mockUser(user: typeof userA, xp: number) {
  server.use(
    http.get(`${API}/auth/me`, () => HttpResponse.json(user)),
    // Phase 21: the profile page reads GET /api/v1/profile (the auth
    // identity is no longer the profile surface's data source).
    http.get(`${API}/profile`, () =>
      HttpResponse.json({
        username: null,
        full_name: user.display_name,
        display_name: user.display_name,
        email: user.email,
        bio: null,
        country: null,
        timezone: null,
        preferred_language: "en",
        experience_level: null,
        reminder_preference: "off",
        learning_goals: null,
        profile_visibility: "community",
        avatar_visibility: "community",
        community_display_name: null,
        member_since: user.created_at,
        plan_code: "survivor",
        plan_name: "Survivor",
      }),
    ),
    http.get(`${API}/gamification`, () =>
      HttpResponse.json({
        total_xp: xp,
        level: 1,
        level_title: "Novice",
        xp_to_next_level: 300 - xp,
        current_streak: 0,
        longest_streak: 0,
        achievements_earned: 0,
        recent_transactions: [],
      }),
    ),
  );
}

describe("cross-user isolation", () => {
  it("User B sees none of User A's data after A logs out", async () => {
    // ── USER A session ──
    mockUser(userA, 125);
    localStorage.clear();
    const queryClient = createTestQueryClient();
    const renderFor = () =>
      renderWithProviders(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter>
              <ProfilePage />
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>,
      );

    const first = renderFor();
    await waitFor(() => { expect(screen.getAllByText("Alice").length).toBeGreaterThan(0); });

    // User A creates a quiz draft (user-scoped key).
    saveDraft({
      version: DRAFT_VERSION,
      userId: 1,
      quizId: "WAT-boiling-Q01",
      attemptId: 5,
      answers: { q01: "C" },
      currentQuestionIndex: 0,
      updatedAt: Date.now(),
    });
    expect(readDraftForQuiz(1, "WAT-boiling-Q01")).not.toBeNull();

    // ── LOGOUT (authoritative + cache clear) ──
    server.use(
      http.post(`${API}/auth/logout`, () => HttpResponse.json({ ok: true })),
      // After logout the server session is gone: the post-clear auth
      // refetch must get 401, never a fresh copy of User A.
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => {
      expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
    });
    first.unmount();

    // ── USER B session (same browser, same tab, NO refresh) ──
    mockUser(userB, 0);
    renderFor();
    await waitFor(() => { expect(screen.getAllByText("Bob").length).toBeGreaterThan(0); });

    // No User A identity or data anywhere.
    expect(screen.queryAllByText("Alice")).toHaveLength(0);
    expect(screen.queryAllByText("alice@example.com")).toHaveLength(0);
    expect(screen.queryAllByText("125")).toHaveLength(0);

    // User B cannot read User A's quiz draft (user-scoped keys).
    expect(readDraftForQuiz(2, "WAT-boiling-Q01")).toBeNull();

    // User A's draft still exists for User A alone — but is never
    // offered to B.
    expect(readDraftForQuiz(1, "WAT-boiling-Q01")).not.toBeNull();
  });

  it("the user menu logs out through the same authoritative path", async () => {
    const logoutSpy = vi.fn();
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json(userA)),
      http.post(`${API}/auth/logout`, () => {
        logoutSpy();
        return HttpResponse.json({ ok: true });
      }),
    );
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <UserMenu />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
    const trigger = await screen.findByRole("button", { name: /account menu/i });
    const user = userEvent.setup();
    await user.click(trigger);
    // The real backend destroys the session on logout: the auth refetch
    // that follows the cache clear must see 401, not User A again.
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );
    await user.click(await screen.findByRole("menuitem", { name: /sign out/i }));
    await waitFor(() => { expect(logoutSpy).toHaveBeenCalledOnce(); });
    expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
  });
});
