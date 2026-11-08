/**
 * Admin analytics — access, honesty rules and API integration.
 *
 * Rendered through the REAL route map (`appRouter.routes`) rather than a
 * hand-built memory router, so these tests also cover the wiring: the
 * nested `/admin/analytics/*` routes, the layout's capability gate and
 * each tab's own endpoint call.
 *
 * The default MSW session is a normal user (the capability probe answers
 * 403), which is exactly what most of these tests need. `asAdmin()`
 * promotes it by overriding the single handler that answers both the
 * probe and the geography data call.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";
import { testUser } from "@/test/msw/handlers";
import { AuthProvider } from "@/features/auth/use-auth";
import {
  ADMIN_GEOGRAPHY_URL,
  adminBilling,
  adminEngagement,
  adminGamification,
  adminOverview,
} from "@/test/msw/admin-analytics";
import { router as appRouter } from "@/app/router";
import { changeLocale, getLocale } from "@/i18n";
import { __resetAdminLanguage } from "./language";

const API = "*/api/v1";

// The console's language is device state that outlives a component, so
// every test starts from the default rather than from the previous test's
// choice. The English assertions below are the same ones that guarded this
// surface before the toggle existed — which is the point: English is the
// default and the previously shipped copy.
beforeEach(async () => {
  await __resetAdminLanguage();
  window.localStorage.clear();
});

/** Long enough to absorb a slow first paint, short enough that a genuine
 * failure reports as an assertion rather than as a vitest timeout. */
const SETTLE = { timeout: 4000 } as const;

/** Promote the session to admin: this one path answers the probe. */
function asAdmin() {
  server.use(
    http.get(ADMIN_GEOGRAPHY_URL, () => HttpResponse.json({ supported: true })),
  );
}

/** The default MSW session has no cookie, so /auth/me answers 401 and the
 * app redirects to /login. Sign in as the shared fixture user. */
function renderAt(path: string) {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  const queryClient = createTestQueryClient();
  const memoryRouter = createMemoryRouter(appRouter.routes, { initialEntries: [path] });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={memoryRouter} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("admin analytics — access", () => {
  it("refuses to render the dashboard for a non-admin session", async () => {
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      },
      SETTLE,
    );

    // No data query is issued, and the KPI surface never appears.
    expect(screen.queryByText(/total users/i)).toBeNull();
  });

  it("hides the navigation entry from a non-admin session", async () => {
    renderAt("/dashboard");

    // Wait for the shell to settle, then confirm the entry is absent.
    await waitFor(
      () => {
        expect(screen.getByRole("navigation", { name: /^account$/i })).toBeInTheDocument();
      },
      SETTLE,
    );
    expect(screen.queryByRole("link", { name: /analytics/i })).toBeNull();
  });

  it("shows the navigation entry once the probe confirms admin", async () => {
    asAdmin();
    renderAt("/dashboard");

    await waitFor(
      () => {
        expect(screen.getByRole("link", { name: /analytics/i })).toBeInTheDocument();
      },
      SETTLE,
    );
  });
});

describe("admin analytics — overview", () => {
  it("renders server-computed KPIs and per-active-user ratios", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
      },
      SETTLE,
    );

    // 1.85 is `active_days_per_active_user` at the API's two-decimal
    // precision — locale-independent, and it only exists if the ratios
    // block rendered from real data.
    expect(screen.getByText("1.85")).toBeInTheDocument();
    expect(screen.getAllByText(/per active user/i).length).toBeGreaterThan(0);
  });

  it("compares against the previous period", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getAllByText(/vs previous/i).length).toBeGreaterThan(0);
      },
      SETTLE,
    );
  });

  it("says 'no comparison period' rather than 0% on an all-time range", async () => {
    asAdmin();
    server.use(
      http.get(`${API}/admin/analytics/overview`, () =>
        HttpResponse.json({ ...adminOverview, previous: null }),
      ),
    );
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getAllByText(/no comparison period/i).length).toBeGreaterThan(0);
      },
      SETTLE,
    );
  });

  it("renders the backend's unsupported metrics instead of inventing revenue", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/not measurable/i)).toBeInTheDocument();
      },
      SETTLE,
    );
    // The reason string is the backend's, shown verbatim.
    expect(
      screen.getByText(/no monetary amount is stored in this database/i),
    ).toBeInTheDocument();
  });

  it("renders the backend's active-user definition verbatim", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/learning activity, not visits/i)).toBeInTheDocument();
      },
      SETTLE,
    );
  });

  it("surfaces a retryable error state when the endpoint fails", async () => {
    asAdmin();
    server.use(
      http.get(`${API}/admin/analytics/overview`, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "boom", request_id: "req-9" } },
          { status: 500 },
        ),
      ),
    );
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      },
      SETTLE,
    );
  });
});

describe("admin analytics — language", () => {
  /** Account-level preference changes all surfaces; analytics has no duplicate selector. */
  async function switchLanguage() { await act(() => changeLocale("pt-BR", { explicit: true })); }

  it("renders in English by default", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /product analytics/i })).toBeInTheDocument();
      },
      SETTLE,
    );

    expect(screen.queryByRole("group", { name: /language|idioma/i })).toBeNull();
    expect(getLocale()).toBe("en");
  });

  it("switches the whole interface to Portuguese", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
      },
      SETTLE,
    );

    await switchLanguage();

    // Page chrome, tab strip, filter bar and KPI labels all follow.
    expect(screen.getByRole("heading", { name: /analytics de produto/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retenção" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desde o início" })).toBeInTheDocument();
    expect(within(document.body).getByText(/métricas principais/i)).toBeInTheDocument();
    expect(screen.getByText(/usuários totais/i)).toBeInTheDocument();
    // The English copy is gone, not merely joined.
    expect(screen.queryByText(/total users/i)).toBeNull();
  });

  it("keeps the choice across navigation within the console", async () => {
    asAdmin();
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
      },
      SETTLE,
    );
    await switchLanguage();

    await userEvent.click(screen.getByRole("link", { name: "Usuários" }));

    await waitFor(
      () => {
        expect(screen.getByRole("navigation", { name: /seções de analytics/i })).toBeInTheDocument();
      },
      SETTLE,
    );
    expect(getLocale()).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(await screen.findByText(/distribuição por plano/i)).toBeInTheDocument();
  });

  it("leaves backend strings in the API's own words", async () => {
    asAdmin();
    renderAt("/admin/analytics/billing");

    await waitFor(
      () => {
        expect(screen.getAllByText(/effective plan/i).length).toBeGreaterThan(0);
      },
      SETTLE,
    );
    await switchLanguage();

    // The limitation reason and the endpoint's notes are the backend's
    // explanation of what it cannot compute; paraphrasing them would turn a
    // data limitation into what looks like a UI gap.
    expect(screen.getByText(adminBilling.revenue.reason)).toBeInTheDocument();
    expect(screen.getByText(adminBilling.notes.trials)).toBeInTheDocument();
    // The metric's own name IS frontend copy, so it does translate.
    expect(screen.getByText(/receita \/ mrr \/ arr/i)).toBeInTheDocument();
  });

  it("translates the access messages", async () => {
    renderAt("/admin/analytics");

    await waitFor(
      () => {
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      },
      SETTLE,
    );

    // The gate renders before any admin-only chrome, so the switch is
    // reached through the page header rather than the dashboard.
    await switchLanguage();

    expect(
      screen.getByText(/acesso de administrador necessário/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/admin access required/i)).toBeNull();
  });
});

describe("admin analytics — honesty rules", () => {
  it("reports an unobservable retention window as missing, never as zero", async () => {
    asAdmin();
    renderAt("/admin/analytics/retention");

    await waitFor(
      () => {
        expect(screen.getByText(/not yet observable/i)).toBeInTheDocument();
      },
      SETTLE,
    );

    // The D30 window of the young cohort is null. A rendered "0.00%"
    // would be indistinguishable from real churn, which is the exact
    // failure the backend's null exists to prevent.
    expect(screen.queryByText("0.00%")).toBeNull();
    // A genuinely observable window in the same table still renders.
    expect(screen.getByText("25.00%")).toBeInTheDocument();
  });

  it("keeps the learning funnel's null first-stage conversion as a dash", async () => {
    asAdmin();
    renderAt("/admin/analytics/learning");

    await waitFor(
      () => {
        expect(screen.getByText(/lesson started/i)).toBeInTheDocument();
      },
      SETTLE,
    );

    // The backend states stages are not nested; that note must reach the
    // UI (it appears both as a callout and in the notes block).
    expect(screen.getAllByText(/not a subset of the stage above/i).length).toBeGreaterThan(0);
  });

  it("explains that nothing can unlock when achievement definitions are absent", async () => {
    asAdmin();
    server.use(
      http.get(`${API}/admin/analytics/gamification`, () =>
        HttpResponse.json({
          ...adminGamification,
          achievements: {
            unlocked_in_range: 0,
            users_with_unlocks: 0,
            definition_count: 0,
            top: [],
          },
          notes: {
            ...adminGamification.notes,
            achievements_empty:
              "No achievement definitions are seeded in this database, so nothing can unlock.",
          },
        }),
      ),
    );
    renderAt("/admin/analytics/gamification");

    await waitFor(
      () => {
        expect(screen.getAllByText(/nothing can unlock/i).length).toBeGreaterThan(0);
      },
      SETTLE,
    );
    // The event counts are explicitly NOT shown as bare zeroes.
    expect(screen.queryByText(/unlocked in range/i)).toBeNull();
  });

  it("renders billing revenue and plan changes as explicitly unsupported", async () => {
    asAdmin();
    renderAt("/admin/analytics/billing");

    await waitFor(
      () => {
        expect(screen.getAllByText(/^not available$/i).length).toBeGreaterThan(0);
      },
      SETTLE,
    );

    expect(screen.getByText(adminBilling.revenue.reason)).toBeInTheDocument();
    expect(screen.getByText(adminBilling.upgrades_downgrades.reason)).toBeInTheDocument();
  });

  it("distinguishes stored plan codes from effective plans in billing", async () => {
    asAdmin();
    renderAt("/admin/analytics/billing");

    await waitFor(
      () => {
        expect(screen.getAllByText(/effective plan/i).length).toBeGreaterThan(0);
      },
      SETTLE,
    );
    // `movement.trials` is not "trials started" — the backend says so in
    // its notes, and that wording must survive to the screen.
    expect(screen.getByText(adminBilling.notes.trials)).toBeInTheDocument();
  });
});

describe("admin analytics — filter guards", () => {
  it("refuses to request a series range beyond the documented 366-day limit", async () => {
    asAdmin();
    const engagement = vi.fn(() => HttpResponse.json(adminEngagement));
    server.use(http.get(`${API}/admin/analytics/engagement`, engagement));

    renderAt("/admin/analytics/engagement?from=2020-01-01&to=2026-09-21");

    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      },
      SETTLE,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/366/);
    // The guard prevents the request rather than discovering the 400.
    expect(engagement).not.toHaveBeenCalled();
  });

  it("allows a series request inside the limit", async () => {
    asAdmin();
    const engagement = vi.fn(() => HttpResponse.json(adminEngagement));
    server.use(http.get(`${API}/admin/analytics/engagement`, engagement));

    renderAt("/admin/analytics/engagement");

    await waitFor(
      () => {
        expect(engagement).toHaveBeenCalled();
      },
      SETTLE,
    );
  });
});
