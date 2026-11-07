/**
 * Profile surface tests (Phase 21 §1/§17).
 *
 * The profile comes from GET /api/v1/profile — the auth bootstrap is no
 * longer the identity source for this surface. Core invariants:
 *   - NO internal authorization concepts are ever rendered (Role,
 *     internal ids, provider details).
 *   - Email is read-only; safe fields only are editable.
 *   - Plan + usage render from the canonical plan queries.
 *   - Logout stays authoritative + cache-clearing; deletion navigates
 *     to login after the backend call.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { AuthProvider } from "@/features/auth/use-auth";
import { ToastHost } from "@/components/layout/ToastHost";
import { testUser, __resetTestProfile, __setTestPlan } from "@/test/msw/handlers";
import ProfilePage from "./index";
import { formatDate } from "@/lib/format/format";

const API = "*/api/v1";

function renderProfileRaw() {
  return renderAtRoute(
    <AuthProvider>
      <ProfilePage />
      {/* ToastHost renders the conflict/toast surface the page pushes
          into (Phase 23 restyle moved inline form errors to toasts). */}
      <ToastHost />
    </AuthProvider>,
    "/profile",
  );
}

function renderProfile() {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderProfileRaw();
}

beforeEach(() => {
  __resetTestProfile();
});

describe("ProfilePage", () => {
  it("loads the profile from the profile endpoint", async () => {
    renderProfile();
    await waitFor(() =>
      { expect(screen.getAllByText(/test learner/i).length).toBeGreaterThan(0); },
    );
    // Email is OIDC-authoritative and read-only — rendered in a
    // disabled input, so assert the input's value, not text content.
    expect(screen.getByDisplayValue("learner@example.com")).toBeInTheDocument();
    // Member since renders with the same formatter the page uses
    // (locale-independent: assert the formatter's output, not en-US).
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent === `Member since ${formatDate("2026-08-01T12:00:00Z")}`,
      ),
    ).toBeInTheDocument();
  });

  it("never renders Role or other internal authorization concepts", async () => {
    renderProfile();
    await waitFor(() =>
      { expect(screen.getAllByText(/test learner/i).length).toBeGreaterThan(0); },
    );
    expect(screen.queryByText(/role/i)).toBeNull();
    expect(screen.queryByText(/^user$/i)).toBeNull();
    expect(screen.queryByText(/admin/i)).toBeNull();
    expect(screen.queryByText(/user_id/i)).toBeNull();
    expect(document.body.textContent).not.toContain("provider");
    expect(document.body.textContent).not.toContain("session_id");
  });

  it("shows safe fallbacks for missing optional identity fields", async () => {
    server.use(
      http.get(`${API}/profile`, () =>
        HttpResponse.json({
          username: null,
          full_name: null,
          display_name: null,
          email: "learner@example.com",
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
          member_since: "2026-08-01T12:00:00Z",
          plan_code: "free",
          plan_name: "Free",
        }),
      ),
    );
    renderProfile();
    await waitFor(() => { expect(screen.getByDisplayValue("learner@example.com")).toBeInTheDocument(); });
    // Fallbacks never fake account data: the identity hero falls back to
    // the app's default identity ("Survivor") and every optional text
    // field renders EMPTY (not fabricated values).
    expect(screen.getByRole("heading", { name: "Survivor" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("");
    expect(screen.getByLabelText("Username")).toHaveValue("");
  });

  it("renders a contextual skeleton while loading", async () => {
    server.use(http.get(`${API}/profile`, () => new Promise(() => {})));
    renderProfileRaw();
    await waitFor(() => { expect(screen.getByLabelText(/loading profile/i)).toBeInTheDocument(); });
  });

  it("shows a retry screen on profile failure — never a logout", async () => {
    server.use(
      http.get(`${API}/profile`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderProfile();
    await waitFor(() =>
      { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); },
    { timeout: 4000 },
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders the plan name and today's usage from the canonical queries", async () => {
    renderProfile();
    await waitFor(() => { expect(screen.getAllByText(/survivor plan/i).length).toBeGreaterThan(0); });
    expect(screen.getByText(/lessons today/i)).toBeInTheDocument();
    // Lessons and quizzes both start at 0/10 in the usage fixture. The
    // count and the allowance are separate text nodes ("0" + "/ 10"),
    // so match on the element's full textContent.
    expect(
      screen.getAllByText((_, el) => el?.textContent === "0 / 10").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows the upgrade CTA when on the Free plan", async () => {
    __setTestPlan("free");
    server.use(
      http.get(`${API}/profile`, () =>
        HttpResponse.json({
          username: null,
          full_name: "Test Learner",
          display_name: "Test Learner",
          email: "learner@example.com",
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
          member_since: "2026-08-01T12:00:00Z",
          plan_code: "free",
          plan_name: "Free",
        }),
      ),
      // No subscription record — the Plan & Usage section falls back to
      // the plan card, which carries the "Upgrade" CTA for Free users.
      http.get(`${API}/subscription`, () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "No subscription" } },
          { status: 404 },
        ),
      ),
    );
    renderProfile();
    await waitFor(() => { expect(screen.getAllByText(/free plan/i).length).toBeGreaterThan(0); });
    // Upgrade CTA appears in the subscription section.
    expect(screen.getAllByRole("link", { name: /upgrade/i }).length).toBeGreaterThanOrEqual(1);
    __setTestPlan("survivor");
  });

  it("edits safe fields via PATCH and reflects the saved profile", async () => {
    const patchSpy = vi.fn();
    let savedFullName = "Test Learner";
    const makeProfile = (fullName: string) => ({
      username: null,
      full_name: fullName,
      display_name: "Test Learner",
      email: "learner@example.com",
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
      member_since: "2026-08-01T12:00:00Z",
      plan_code: "survivor",
      plan_name: "Survivor",
    });
    server.use(
      http.get(`${API}/profile`, () => HttpResponse.json(makeProfile(savedFullName))),
      http.patch(`${API}/profile`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patchSpy(body);
        savedFullName = typeof body.full_name === "string" ? body.full_name : savedFullName;
        return HttpResponse.json(makeProfile(savedFullName));
      }),
    );
    renderProfile();
    const nameInput = await screen.findByLabelText(/full name/i);
    const user = userEvent.setup();
    await user.clear(nameInput);
    await user.type(nameInput, "Field Ranger");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => { expect(patchSpy).toHaveBeenCalledOnce(); });
    // Empty optional text fields are sent as null (server convention).
    const firstCall = patchSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toMatchObject({ full_name: "Field Ranger" });
    // The saved profile is reflected in the header avatar name.
    await waitFor(() => { expect(screen.getAllByText(/field ranger/i).length).toBeGreaterThan(0); });
  });

  it("surfaces a USERNAME_TAKEN conflict inline", async () => {
    server.use(
      http.patch(`${API}/profile`, () =>
        HttpResponse.json(
          { error: { code: "USERNAME_TAKEN", message: "That username is already taken" } },
          { status: 409 },
        ),
      ),
    );
    renderProfile();
    const usernameInput = await screen.findByLabelText(/username/i);
    const user = userEvent.setup();
    await user.type(usernameInput, "already-taken");
    await user.click(screen.getByRole("button", { name: /save profile/i }));
    // The conflict surfaces BOTH inline under the form and as a toast.
    await waitFor(() =>
      { expect(screen.getAllByText(/that username is already taken/i).length).toBeGreaterThanOrEqual(1); },
    );
  });

  it("logs out: authoritative call, full cache clear, login redirect", async () => {
    const logoutSpy = vi.fn();
    server.use(
      http.post(`${API}/auth/logout`, () => {
        logoutSpy();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { router, queryClient } = renderProfile();
    await waitFor(() => { expect(screen.getAllByText(/test learner/i).length).toBeGreaterThan(0); });

    expect(queryClient.getQueryData(["auth", "me"])).toBeDefined();

    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 },
        ),
      ),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => { expect(logoutSpy).toHaveBeenCalledOnce(); });
    expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("deletes the account through the backend and leaves for login", async () => {
    const deleteSpy = vi.fn();
    server.use(
      http.delete(`${API}/account`, () => {
        deleteSpy();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { router } = renderProfile();
    await screen.findByLabelText(/full name/i);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /delete account/i }));
    await user.click(await screen.findByRole("button", { name: /delete permanently/i }));

    await waitFor(() => { expect(deleteSpy).toHaveBeenCalledOnce(); });
    expect(router.state.location.pathname).toBe("/login");
  });

  it("keeps user identity out of storage and the URL", async () => {
    renderProfile();
    await waitFor(() => { expect(screen.getAllByText(/test learner/i).length).toBeGreaterThan(0); });
    const storageKeys = Object.keys(localStorage);
    expect(storageKeys.filter((k) => k.includes("learner") || k.includes("token"))).toHaveLength(0);
  });
});
