/**
 * Guard behavior: RequireAuth preserves the return path and never
 * redirects on network errors; RedirectIfAuthed bounces signed-in users.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { AuthProvider } from "./use-auth";
import { RequireAuth, RedirectIfAuthed } from "./guards";

const API = "*/api/v1";

function ProtectedProbe() {
  return <p>PROTECTED</p>;
}

describe("RequireAuth", () => {
  it("redirects 401s to /login preserving the return path", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );
    const { router } = renderAtRoute(
      <AuthProvider>
        <RequireAuth>
          <ProtectedProbe />
        </RequireAuth>
      </AuthProvider>,
      "/modules/WAT-boiling/quiz",
    );
    await waitFor(() =>
      { expect(router.state.location.pathname).toBe("/login"); },
    );
    expect(router.state.location.search).toContain(
      "redirect_to=%2Fmodules%2FWAT-boiling%2Fquiz",
    );
    expect(screen.queryByText("PROTECTED")).not.toBeInTheDocument();
  });

  it("renders children for authenticated sessions", async () => {
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
    renderAtRoute(
      <AuthProvider>
        <RequireAuth>
          <ProtectedProbe />
        </RequireAuth>
      </AuthProvider>,
      "/dashboard",
    );
    await waitFor(() => { expect(screen.getByText("PROTECTED")).toBeInTheDocument(); });
  });

  it("shows a retry screen on server failure instead of logging out", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderAtRoute(
      <AuthProvider>
        <RequireAuth>
          <ProtectedProbe />
        </RequireAuth>
      </AuthProvider>,
      "/dashboard",
    );
    await waitFor(
      () => { expect(screen.getByText(/couldn't reach the server/i)).toBeInTheDocument(); },
      { timeout: 5000 },
    );
    expect(screen.queryByText("PROTECTED")).not.toBeInTheDocument();
  });
});

describe("RedirectIfAuthed", () => {
  it("sends authenticated users to /dashboard", async () => {
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
    const { router } = renderAtRoute(
      <AuthProvider>
        <RedirectIfAuthed>
          <p>LOGIN SCREEN</p>
        </RedirectIfAuthed>
      </AuthProvider>,
      "/login",
    );
    await waitFor(() => { expect(router.state.location.pathname).toBe("/dashboard"); });
    expect(screen.queryByText("LOGIN SCREEN")).not.toBeInTheDocument();
  });
});
