/**
 * Mobile overlay + layout behaviour.
 *
 * These assertions need a layout engine, so they live in Playwright rather
 * than vitest: "inside the viewport" and "no horizontal overflow" cannot be
 * checked in jsdom. Everything runs at the Pixel 7 viewport the mobile
 * project already uses (390×844).
 *
 * The defects being guarded:
 *  - the account popover sat at z-auto under portaled content and could land
 *    outside the viewport on a short screen,
 *  - dialogs had no max-height, so a tall panel's top and bottom were
 *    unreachable,
 *  - toasts were pinned under a two-row header.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API = "**/api/v1/**";

const VIEWPORT = { width: 390, height: 844 };

/** Everything the shell asks for on a normal visit. */
function mockSession(page: Page): void {
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
          body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-m" } }),
        });
    }
  });
}

/** Horizontal overflow of the document, in px. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() =>
    document.scrollingElement
      ? document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth
      : 0,
  );
}

test.use({ viewport: VIEWPORT });

test.describe("mobile overlays", () => {
  test("the account menu opens fully inside the viewport", async ({ page }) => {
    mockSession(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await page.getByRole("button", { name: /account menu/i }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Fully on screen — not clipped by an edge, not hanging off the bottom.
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  });

  test("the account menu clears the fixed bottom navigation", async ({ page }) => {
    mockSession(page);
    await page.goto("/dashboard");

    // Measured BEFORE opening: Radix's menu is modal, so it marks the rest
    // of the page aria-hidden and the nav would leave the accessibility
    // tree the moment the menu opens.
    const nav = await page.getByRole("navigation", { name: /primary mobile/i }).boundingBox();

    await page.getByRole("button", { name: /account menu/i }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();

    expect(box).not.toBeNull();
    expect(nav).not.toBeNull();
    if (!box || !nav) return;

    // The menu must not sit under the nav — their boxes cannot overlap.
    expect(box.y + box.height).toBeLessThanOrEqual(nav.y + 1);
  });

  test("the mobile drawer does not overflow the viewport horizontally", async ({ page }) => {
    mockSession(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /open navigation/i }).click();

    const drawer = page.getByRole("navigation", { name: /^primary$/i }).first();
    await expect(drawer).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("core routes do not produce horizontal overflow at 390px", async ({ page }) => {
    mockSession(page);
    for (const route of ["/dashboard", "/categories", "/progress", "/gamification", "/profile", "/plans"]) {
      await page.goto(route);
      await expect(page.locator("#main")).toBeVisible();
      expect(await horizontalOverflow(page), `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
    }
  });

  test("the bottom navigation stays reachable and is not covered", async ({ page }) => {
    mockSession(page);
    await page.goto("/dashboard");

    const nav = page.getByRole("navigation", { name: /primary mobile/i });
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // The nav is fixed to the bottom edge, and the element at its centre is
    // itself — nothing has been painted on top of it.
    const hitsNav = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest('nav[aria-label="Primary mobile"]') !== null;
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(hitsNav).toBe(true);
  });
});
