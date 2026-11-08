import { expect, test, type Page } from "@playwright/test";

async function mockNotifications(page: Page, options: { empty?: boolean; error?: boolean; locale?: "en" | "pt-BR" } = {}) {
  let read = false;
  let failed = options.error ?? false;
  const acknowledged: unknown[] = [];
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/auth/me") return json({ user_id: 42, email: "notifications@example.com", display_name: "Learner", created_at: "2026-08-01T00:00:00Z", preferred_language: options.locale ?? "en", language_confirmed_at: "2026-11-08T00:00:00Z" });
    if (path === "/categories") return json({ categories: [] });
    if (path === "/gamification") return json({ total_xp: 125, level: 1, level_title: "Novice", xp_to_next_level: 175, current_streak: 1, longest_streak: 1, achievements_earned: 0, recent_transactions: [] });
    if (path === "/gamification/achievements") return json({ earned: [], unearned: [] });
    if (path === "/notifications/read") { acknowledged.push(route.request().postDataJSON()); read = true; return json({ ok: true }); }
    if (path === "/notifications") {
      if (failed) return json({ error: { code: "FORBIDDEN", message: "Fixture failure", request_id: "notifications" } }, 403);
      return json({ unread_count: options.empty || read ? 0 : 1, items: options.empty ? [] : [{ notification_id: "achievement:7", kind: "achievement", at: "2026-11-08T12:00:00Z", read_at: read ? "2026-11-08T13:00:00Z" : null, target: "/gamification", subject: { entity_type: "achievement", entity_id: "first_quiz", title: "First quiz passed", description: "Pass your first quiz" } }] });
    }
    return json({ error: { code: "FORBIDDEN", message: "Fixture not available", request_id: "notifications" } }, 403);
  });
  return { acknowledged, recover: () => { failed = false; } };
}

test("bell opens real notifications, stays in the viewport and saves read state across refresh", async ({ page }, info) => {
  const backend = await mockNotifications(page);
  await page.goto("/categories");
  await expect(page.getByTestId("notification-unread")).toHaveText("1");
  const trigger = page.getByRole("button", { name: "Notifications", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Notifications", exact: true });
  await expect(menu).toBeVisible();
  expect(backend.acknowledged).toHaveLength(0);
  const box = await menu.boundingBox(); const viewport = page.viewportSize();
  expect(box).not.toBeNull(); expect(viewport).not.toBeNull();
  if (!box || !viewport) throw new Error("Expected a laid out notification menu");
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - (info.project.name === "mobile-chromium" ? 64 : 0));
  await page.screenshot({ path: `visual-review/notifications/inbox-${info.project.name}.png` });
  await page.getByRole("menuitem", { name: "Mark all as read" }).click();
  await expect(page.getByTestId("notification-unread")).toHaveCount(0);
  expect(backend.acknowledged).toEqual([{ notification_ids: ["achievement:7"] }]);
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  await page.reload(); await trigger.click();
  await expect(page.getByTestId("notification-unread")).toHaveCount(0);
  await page.getByRole("menuitem", { name: /New achievement unlocked/ }).click();
  await expect(page).toHaveURL(/\/gamification$/);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("empty inbox has no unread indicator and can close by clicking outside", async ({ page }, info) => {
  if (info.project.name === "chromium") await page.setViewportSize({ width: 320, height: 640 });
  await mockNotifications(page, { empty: true, locale: "pt-BR" });
  await page.goto("/categories");
  await page.getByRole("button", { name: "Notificações", exact: true }).click();
  await expect(page.getByText("Tudo em dia por aqui")).toBeVisible();
  await expect(page.getByTestId("notification-unread")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.mouse.click(2, 2);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("failed requests show retry rather than an empty inbox", async ({ page }) => {
  const backend = await mockNotifications(page, { error: true });
  await page.goto("/categories");
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Couldn't load your notifications.");
  backend.recover();
  await page.getByRole("menuitem", { name: "Try again" }).click();
  await expect(page.getByRole("menuitem", { name: /New achievement unlocked/ })).toBeVisible();
});
