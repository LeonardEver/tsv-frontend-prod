/**
 * Application smoke: the full provider stack + router + shell renders;
 * unauthenticated users land on the login screen, authenticated users
 * reach the dashboard shell.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { App } from "./providers";
import { queryClient } from "./query-client";

const API = "*/api/v1";

describe("App", () => {
  // The app uses the module-singleton query client — clear its cache so
  // handler overrides in each test are never masked by prior data.
  beforeEach(() => {
    queryClient.clear();
  });

  it("renders the login screen for unauthenticated visitors", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );
    renderWithProviders(<App />);
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: /practical survival/i })).toBeInTheDocument(); },
    );
    expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/v1/auth/login"),
    );
  });

  it("renders the authenticated shell with the dashboard route", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({
          user_id: 1,
          email: "learner@example.com",
          display_name: "Learner",
          role: "user",
          created_at: "2026-08-01T12:00:00Z",
        }),
      ),
    );
    renderWithProviders(<App />);
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: /welcome back, learner/i })).toBeInTheDocument(); },
    );
    // Desktop header nav + mobile bottom nav both exist in the DOM
    // (jsdom applies no media queries) — in real browsers only the
    // matching one is rendered per breakpoint.
    expect(screen.getAllByRole("navigation", { name: "Primary" }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the header gamification chip from authoritative data (no hardcoded values)", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({
          user_id: 1,
          email: "learner@example.com",
          display_name: "Learner",
          role: "user",
          created_at: "2026-08-01T12:00:00Z",
        }),
      ),
      http.get(`${API}/gamification`, () =>
        HttpResponse.json({
          total_xp: 250,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 50,
          current_streak: 3,
          longest_streak: 3,
          achievements_earned: 2,
          recent_transactions: [],
        }),
      ),
    );
    renderWithProviders(<App />);
    // The chip moved into the AppShell topbar: XPBadge + LevelBadge read
    // from the canonical gamification query. The desktop and mobile rows
    // both render in jsdom (no media queries), so each value appears
    // more than once.
    const xpBadges = await screen.findAllByText("250 XP");
    expect(xpBadges.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Novice").length).toBeGreaterThan(0);
    // The next-level threshold also comes from the query, not a constant.
    expect(screen.getByText(/50 XP to LVL 2/i)).toBeInTheDocument();
    // The shell nav still links to the gamification surface.
    expect(screen.getByRole("link", { name: /rewards/i })).toHaveAttribute("href", "/gamification");
  });
});
