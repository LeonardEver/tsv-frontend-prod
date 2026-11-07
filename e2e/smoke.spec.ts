/**
 * Foundation smoke tests (frontend spec §25):
 *   app opens → shell renders → API mock responds → authenticated route
 *   is reachable.
 *
 * The API is mocked at the NETWORK boundary (page.route) with
 * representative contract-shaped responses — no real backend, no real
 * OAuth, never production.
 */
import { expect, test } from "@playwright/test";

const API = "**/api/v1/**";

function mockAuthenticatedSession(page: import("@playwright/test").Page): void {
  void page.route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    switch (path) {
      case "/api/v1/auth/me":
        return json({
          user_id: 1,
          email: "learner@example.com",
          display_name: "Learner",
          role: "user",
          created_at: "2026-08-01T12:00:00Z",
        });
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
      default:
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-1" } }),
        });
    }
  });
}

function mockNoSession(page: import("@playwright/test").Page): void {
  void page.route(API, (route) => {
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "e2e-2" } }),
    });
  });
}

test.describe("foundation smoke", () => {
  test("unauthenticated visitor lands on the login screen", async ({ page }) => {
    mockNoSession(page);
    await page.goto("/");
    // The brand is an eyebrow <p> now; the h1 is the value proposition.
    await expect(
      page.getByRole("heading", { name: /practical survival/i }),
    ).toBeVisible();
    await expect(page.getByText("Survival Academy").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /continue with google/i })).toBeVisible();
  });

  test("authenticated user reaches the dashboard shell", async ({ page }) => {
    mockAuthenticatedSession(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, learner/i })).toBeVisible();
    // Shell landmarks: header nav + skip link + content region.
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
    await expect(page.locator("#main")).toBeVisible();
  });

  test("login screen accepts keyboard focus and the login link points at the backend flow", async ({ page }) => {
    mockNoSession(page);
    await page.goto("/login");
    const link = page.getByRole("link", { name: /continue with google/i });
    await link.focus();
    await expect(link).toBeFocused();
    const href = await link.getAttribute("href");
    expect(href).toContain("/api/v1/auth/login");
  });

  test("theme toggle switches the palette and persists as a device preference", async ({ page }) => {
    mockAuthenticatedSession(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back, learner/i })).toBeVisible();

    // Dark is the default identity.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Toggle to light — the label always names the ACTION.
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();

    // The preference survives a full reload (device-scoped, not session).
    await page.reload();
    await expect(page.getByRole("heading", { name: /welcome back, learner/i })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // And back.
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
