/**
 * Auth bootstrap tests: /auth/me drives exactly three states, and a
 * network failure must NOT look like "logged out".
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { AuthProvider } from "./use-auth";
import { useAuth } from "./auth-context";

const API = "*/api/v1";

function Probe() {
  const { status, user } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.email ?? "none"}</span>
    </div>
  );
}

function renderProbe() {
  return renderWithProviders(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("auth bootstrap", () => {
  it("authenticates when the backend session is valid", async () => {
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
    renderProbe();
    await waitFor(() => { expect(screen.getByTestId("status")).toHaveTextContent("authenticated"); });
    expect(screen.getByTestId("user")).toHaveTextContent("learner@example.com");
  });

  it("marks 401 as unauthenticated", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );
    renderProbe();
    await waitFor(() => { expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"); });
  });

  it("marks server failures as error (never a logout)", async () => {
    // 503 = backend unreachable. Same contract as a network failure for
    // the auth state machine: "error", NOT "unauthenticated".
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderProbe();
    // The client's GET-retry policy (2 retries with backoff) runs before
    // the query settles into error — allow time for it.
    await waitFor(
      () => { expect(screen.getByTestId("status")).toHaveTextContent("error"); },
      { timeout: 5000 },
    );
  });
});
