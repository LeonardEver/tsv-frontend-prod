/**
 * Admin analytics route — `/admin/analytics/*`.
 *
 * Covers what the unit suite cannot: the route renders in a real browser,
 * the tab strip drives the nested routes, and the surface degrades
 * honestly in each direction (non-admin refused, admin served).
 *
 * The session fixture is the ONLY difference between the admin and
 * non-admin cases — the app has no local notion of a role, so admin-ness
 * is entirely the backend's answer to the capability probe.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API = "**/api/v1/**";

/** The shell's Account navigation — the only place the admin entry lives. */
function accountNav(page: Page) {
  return page.locator('nav[aria-label="Account"]');
}

const USER = {
  user_id: 1,
  email: "learner@example.com",
  display_name: "Learner",
  created_at: "2026-08-01T12:00:00Z",
};

const GEOGRAPHY = {
  supported: true,
  range: { from: "2026-08-23", to: "2026-09-21" },
  totals: { users_with_country: 96, users_without_country: 24, coverage_pct: 80 },
  countries: [
    {
      country: "BR",
      users: 48,
      percentage_of_users: 50,
      active_users: 22,
      paying_users: 19,
      trial_users: 2,
      active_rate: 45.83,
      paying_rate: 39.58,
    },
  ],
  notes: { reliability: "Declared, not observed." },
};

const OVERVIEW = {
  range: { from: "2026-08-23", to: "2026-09-21" },
  metrics: {
    total_users: 120,
    new_users: 34,
    paying_users: 41,
    free_users: 79,
    trial_users: 3,
    churned_users: 2,
    active_users: 52,
    active_days: 96,
    lessons_completed: 310,
    quiz_submissions: 84,
    xp_awarded: 15500,
    lessons_completed_per_active_user: 5.96,
    quiz_submissions_per_active_user: 1.62,
    xp_per_active_user: 298.08,
    active_days_per_active_user: 1.85,
  },
  previous: null,
  activity_windows: { dau: 9, wau: 31, mau: 52, basis: "Learning activity, not visits." },
  limitations: {
    revenue: { supported: false, reason: "No monetary amount is stored in this database." },
    plan_changes: { supported: false, reason: "No plan-change history is recorded." },
    visit_dau: { supported: false, reason: "No app-open event is recorded." },
  },
};

const RETENTION = {
  range: { from: "2026-08-23", to: "2026-09-21" },
  definition: {
    activity: "Retained on day N means learning-active on exactly day N.",
    day_boundary: "All boundaries are UTC.",
    observability: "A cohort younger than N days reports null, never zero.",
  },
  cohorts: [
    {
      cohort: "2026-08-24",
      cohort_size: 120,
      max_observable_day: 28,
      d1: { users: 30, rate: 25 },
      d7: { users: 12, rate: 10 },
      d14: { users: 8, rate: 6.67 },
      d30: null,
    },
  ],
};

/** Signs the session in; `admin` decides what the analytics API answers. */
function mockSession(page: Page, admin: boolean): void {
  void page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    const forbidden = () =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "FORBIDDEN", message: "Admin access required", request_id: "e2e-3" },
        }),
      });

    switch (path) {
      case "/api/v1/auth/me":
        return json(USER);
      case "/api/v1/progress":
        return json({
          modules_completed: 0,
          total_modules: 9,
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          recent_activity: [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 0,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 300,
          current_streak: 0,
          longest_streak: 0,
          achievements_earned: 0,
          recent_transactions: [],
        });
      case "/api/v1/categories":
        return json({ categories: [] });
      // Answers BOTH the capability probe and the Geography section.
      case "/api/v1/admin/analytics/geography":
        return admin ? json(GEOGRAPHY) : forbidden();
      case "/api/v1/admin/analytics/overview":
        return admin ? json(OVERVIEW) : forbidden();
      case "/api/v1/admin/analytics/retention":
        return admin ? json(RETENTION) : forbidden();
      default:
        return admin ? forbidden() : route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-4" },
          }),
        });
    }
  });
}

test.describe("admin analytics", () => {
  test("a non-admin is refused and sees no navigation entry", async ({ page }) => {
    mockSession(page, false);
    await page.goto("/admin/analytics");

    await expect(page.getByText(/admin access required/i)).toBeVisible();
    // The surface never renders, for every session.
    await expect(page.getByRole("heading", { name: /product analytics/i })).toBeVisible();
    await expect(page.getByText(/total users/i)).toHaveCount(0);
    // Scoped to the shell's Account nav and asserted on the DOM rather
    // than by role: the sidebar is `display:none` on mobile, which drops
    // it out of the accessibility tree and makes a role query
    // viewport-dependent.
    await expect(accountNav(page).locator('a[href="/admin/analytics"]')).toHaveCount(0);
  });

  test("an admin lands on the dashboard with server-computed KPIs", async ({ page }) => {
    mockSession(page, true);
    await page.goto("/admin/analytics");

    await expect(page.getByRole("heading", { name: /product analytics/i })).toBeVisible();
    await expect(page.getByText(/total users/i)).toBeVisible();
    await expect(page.getByText("1.85")).toBeVisible();
    // The API's own definition of "active" is on screen, not paraphrased.
    await expect(page.getByText(/learning activity, not visits/i)).toBeVisible();
    // And an unsupported metric is stated, not faked.
    await expect(page.getByText(/no monetary amount is stored/i)).toBeVisible();
    // Rendered for admins in the shell's Account nav (mobile reaches it
    // through the drawer, which reuses this content — the bottom bar
    // stays a fixed five). Scoped, because the Overview TAB also links
    // here and would otherwise be counted.
    await expect(accountNav(page).locator('a[href="/admin/analytics"]')).toHaveCount(1);
  });

  test("the tab strip drives the nested routes", async ({ page }) => {
    mockSession(page, true);
    await page.goto("/admin/analytics");

    await page.getByRole("link", { name: "Retention" }).click();
    await expect(page).toHaveURL(/\/admin\/analytics\/retention$/);

    // A young cohort's D30 is null. It must read as missing data, never
    // as a 0% that looks like churn. `exact` matters: Playwright's string
    // matcher is a substring match, and "10.00%" contains "0.00%".
    await expect(page.getByText(/not yet observable/i)).toBeVisible();
    await expect(page.getByText("0.00%", { exact: true })).toHaveCount(0);
    await expect(page.getByText("25.00%", { exact: true })).toBeVisible();
  });

  test("the console shares the persisted account language without touching API diagnostics", async ({
    page,
  }) => {
    mockSession(page, true);
    await page.goto("/admin/analytics");

    await expect(page.getByText(/total users/i)).toBeVisible();

    // The account-entry preference is shared with analytics; no duplicate selector.
    await page.evaluate(() => { localStorage.setItem("survival-academy-language", "pt-BR"); });
    await page.reload();

    await expect(page.getByRole("heading", { name: /analytics de produto/i })).toBeVisible();
    await expect(page.getByText(/usuários totais/i)).toBeVisible();
    // The backend's own explanation of "active" survives the switch.
    await expect(page.getByText(/learning activity, not visits/i)).toBeVisible();
    // And the English chrome is genuinely replaced, not merely joined.
    await expect(page.getByRole("heading", { name: /^product analytics$/i })).toHaveCount(0);

    // Refresh preserves the shared explicit preference.
    await page.reload();
    await expect(page.getByRole("heading", { name: /analytics de produto/i })).toBeVisible();
    await expect(page.getByRole("group", { name: "Language" })).toHaveCount(0);
  });

  test("a series range beyond the documented limit is refused before the request", async ({ page }) => {
    mockSession(page, true);
    const engagement: string[] = [];
    page.on("request", (request) => {
      // The API path, not the document URL — the page URL contains the
      // same segment and would match too.
      if (request.url().includes("/api/v1/admin/analytics/engagement")) {
        engagement.push(request.url());
      }
    });

    await page.goto("/admin/analytics/engagement?from=2020-01-01&to=2026-09-21");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("366");
    expect(engagement).toHaveLength(0);
  });
});
