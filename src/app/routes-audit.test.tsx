/**
 * Route + navigation audit (Phase 15 §18, §40): every implemented
 * route renders after direct navigation, and auth expiration redirects
 * consistently. Reuses the full App router (real route map).
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/render";
import { AuthProvider } from "@/features/auth/use-auth";
import { createMemoryRouter, RouterProvider } from "react-router";
import { router as appRouter } from "./router";

const API = "*/api/v1";

function renderRoute(path: string) {
  const queryClient = createTestQueryClient();
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
  const memoryRouter = createMemoryRouter(appRouter.routes, {
    initialEntries: [path],
  });
  const result = renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={memoryRouter} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

describe("route audit", () => {
  const routes: Array<[string, RegExp]> = [
    ["/dashboard", /welcome back, learner/i],
    ["/categories", /^learn$/i],
    ["/categories/water", /water/i],
    ["/modules/WAT-boiling", /boiling water for purification/i],
    ["/modules/WAT-boiling/lesson", /boiling water for purification/i],
    ["/modules/WAT-boiling/quiz", /boiling water quiz/i],
    ["/resources/WAT-boiling-R01", /boiling water quick reference/i],
    ["/progress", /^progress$/i],
    ["/gamification", /^progression$/i],
    ["/profile", /test learner|learner@example\.com/i],
  ];

  it.each(routes)("deep link %s renders after a fresh load", async (path, expected) => {
    renderRoute(path);
    await waitFor(
      () => {
        const headingMatch = screen.queryAllByRole("heading", { name: expected }).length > 0;
        // queryAllByText (never throws on multiple matches): page titles
        // also appear in nav links, breadcrumbs and detail grids.
        const textMatch = screen.queryAllByText(expected).length > 0;
        expect(headingMatch || textMatch).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("auth expiration (401) redirects to login instead of rendering stale data", async () => {
    const queryClient = createTestQueryClient();
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );
    const memoryRouter = createMemoryRouter(appRouter.routes, {
      initialEntries: ["/progress"],
    });
    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={memoryRouter} />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(memoryRouter.state.location.pathname).toBe("/login");
    });
    // The login screen appears — no stale private data is rendered.
    // (waitFor, not getByRole: under parallel test load the router
    // commits the redirect before React paints the login screen.)
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /practical survival/i })).toBeInTheDocument();
    });
  });

  it("every internal href targets an existing route", async () => {
    renderRoute("/dashboard");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome back, learner/i })).toBeInTheDocument();
    });
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='/']"));
    const knownPaths = new Set(
      appRouter.routes
        .flatMap((r) => (typeof r.path === "string" ? [r.path] : []))
        .filter((p) => p && !p.includes(":")),
    );
    for (const link of links) {
      const target = link.getAttribute("href") ?? "";
      // Static routes or parameterised route families — all must match
      // a registered path prefix.
      const matches = Array.from(knownPaths).some(
        (p) => target === p || target.startsWith(`${p}/`) || p === "*",
      );
      expect(matches || target === "#main" || target.startsWith("#")).toBe(true);
    }
  });
});
