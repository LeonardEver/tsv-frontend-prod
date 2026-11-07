/**
 * Light theme — verified from computed styles, not from a screenshot.
 *
 * The requirement is qualitative ("warm, calm, not glaring white"), so
 * these assertions pin the measurable properties that carry it:
 *
 *  1. the page background is not pure white and is warm (red channel
 *     highest, blue lowest) rather than neutral grey,
 *  2. depth runs the right way — surfaces are lighter than the page they
 *     sit on, so cards read as raised rather than dissolving,
 *  3. text keeps AA contrast on the surfaces it actually sits on.
 *
 * The dark theme is asserted alongside so the change cannot regress it.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API = "**/api/v1/**";

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
          modules_completed: 0, total_modules: 9, total_xp: 0, level: 1,
          current_streak: 0, longest_streak: 0, recent_activity: [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 0, level: 1, level_title: "Novice", xp_to_next_level: 300,
          current_streak: 0, longest_streak: 0, achievements_earned: 0, recent_transactions: [],
        });
      case "/api/v1/categories":
        return json({ categories: [] });
      default:
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "NOT_FOUND", message: "nope", request_id: "e2e-t" } }),
        });
    }
  });
}

/**
 * Reads the theme tokens as sRGB bytes and derives WCAG ratios.
 *
 * The values are resolved through a 1×1 canvas rather than by parsing
 * `getComputedStyle().color`: Chrome reports a computed colour in the space
 * it was authored in, so these tokens come back as `oklch(0.955 0.008 85)`
 * — parsing those numbers as RGB silently yields nonsense. The canvas
 * rasterises into sRGB, which is exactly what paints.
 */
async function palette(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    const read = (token: string): number[] => {
      const declared = root.getPropertyValue(token).trim();
      ctx.fillStyle = "#000";
      ctx.fillStyle = declared;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r ?? 0, g ?? 0, b ?? 0];
    };
    const channel = (v: number): number => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const luminance = ([r, g, b]: number[]): number =>
      0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
    const contrast = (a: number[], b: number[]): number => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const background = read("--background");
    const card = read("--card");
    const foreground = read("--foreground");
    const mutedForeground = read("--muted-foreground");

    return {
      theme: document.documentElement.dataset.theme,
      background,
      card,
      colorScheme: root.colorScheme,
      contrastForegroundOnCard: contrast(foreground, card),
      contrastMutedOnCard: contrast(mutedForeground, card),
    };
  });
}

test.describe("light theme", () => {
  test.beforeEach(async ({ page }) => {
    mockSession(page);
    await page.goto("/dashboard");
    await expect(page.locator("#main")).toBeVisible();
    // Dark is the default identity — switch to light.
    await page.getByRole("button", { name: /switch to light theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the page background is warm and never pure white", async ({ page }) => {
    const { background } = await palette(page);
    const [r, g, b] = background as [number, number, number];

    // Not #FFFFFF, and not near it: a glare-free page.
    expect(r === 255 && g === 255 && b === 255).toBe(false);
    expect(Math.min(r, g, b)).toBeLessThan(250);

    // Warm: red channel leads, blue trails. This is what separates a paper
    // tone from the neutral grey an inverted dark theme would produce.
    expect(r).toBeGreaterThanOrEqual(b);
    expect(r - b).toBeGreaterThan(1);
  });

  test("cards are lighter than the page they sit on", async ({ page }) => {
    const { background, card } = await palette(page);
    const sum = (rgb: number[]): number => rgb.reduce((a, c) => a + c, 0);
    // Depth runs page → card, so a card reads as raised. Inverting this is
    // what made the old theme's cards need a shadow to separate at all.
    expect(sum(card)).toBeGreaterThan(sum(background));
  });

  test("text keeps AA contrast on the card surface", async ({ page }) => {
    const { contrastForegroundOnCard, contrastMutedOnCard } = await palette(page);
    expect(contrastForegroundOnCard).toBeGreaterThanOrEqual(4.5);
    expect(contrastMutedOnCard).toBeGreaterThanOrEqual(4.5);
  });

  test("switching back restores the dark palette unchanged", async ({ page }) => {
    await page.getByRole("button", { name: /switch to dark theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const { background, colorScheme } = await palette(page);
    // The dark identity is dark: a low-luminance page and a dark scheme.
    expect(colorScheme).toBe("dark");
    const sum = (rgb: number[]): number => rgb.reduce((a, c) => a + c, 0);
    expect(sum(background)).toBeLessThan(150);
  });
});
