import { expect, test, type Page } from "@playwright/test";

async function localApi(page: Page, denied = false) {
  let plan = "free";
  const mutations: unknown[] = [];
  const billing: string[] = [];
  page.on("request", request => { if (/^https?:\/\/(?:[^/]*\.)?stripe\.(?:com|network)\b/.test(request.url()) || request.url().includes("/api/v1/billing/")) billing.push(request.url()); });
  const permissions = () => ({ daily_lessons: plan === "free" ? 1 : null, daily_quizzes: plan === "free" ? 1 : null, resource_download: plan !== "free", quiz_before_lesson: plan !== "free", community: plan !== "free" });
  const subscription = () => ({ plan_code: plan, plan_name: plan === "free" ? "Free" : "Operator", price: plan === "free" ? 0 : 19.9, currency: "usd", billing_period: plan === "free" ? null : "month", status: "active", started_at: "2026-11-08T00:00:00Z", current_period_started_at: "2026-11-08T00:00:00Z", renews_at: null, ends_at: null, canceled_at: null, cancel_at_period_end: false, provider: null, entitlements: permissions() });
  await page.route("**/api/v1/**", async route => {
    const pathname = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === "/auth/me") return json({ user_id: 42, email: "mock-user-123@example.com", display_name: "Mock User", role: "user", created_at: "2026-11-08T00:00:00Z", preferred_language: "en", language_confirmed_at: "2026-11-08T00:00:00Z" });
    if (pathname === "/subscription") return json(subscription());
    if (pathname === "/subscription/dev-plan") {
      mutations.push(route.request().postDataJSON());
      if (denied) return json({ error: { code: "FORBIDDEN", message: "Local mock required", request_id: "local-test" } }, 403);
      plan = "operator"; return json(subscription());
    }
    if (pathname === "/plans") return json({ plans: [
      { code: "free", name: "Free", price: 0, currency: "usd", billing_period: null, entitlements: { daily_lessons: 1, daily_quizzes: 1, resource_download: false, quiz_before_lesson: false, community: false } },
      { code: "operator", name: "Operator", price: 19.9, currency: "usd", billing_period: "month", entitlements: { daily_lessons: null, daily_quizzes: null, resource_download: true, quiz_before_lesson: true, community: true } },
    ] });
    if (pathname === "/usage") return json({ plan_code: plan, plan_name: plan, usage_date: "2026-11-08", lesson_completions: 0, quiz_attempts: 0, limits: { daily_lessons: permissions().daily_lessons, daily_quizzes: permissions().daily_quizzes }, resets_at: "2026-11-09T00:00:00Z" });
    if (pathname === "/gamification") return json({ total_xp: 125, level: 1, level_title: "Novice", xp_to_next_level: 175, current_streak: 1, longest_streak: 1, achievements_earned: 0, recent_transactions: [] });
    if (pathname === "/notifications") return json({ items: [], unread_count: 0 });
    if (pathname === "/categories") return json({ categories: [{ slug: "water", code: "WAT", title: "Water", module_count: 1, completed_count: 0 }] });
    if (pathname === "/resources/WAT-boiling-R01") return json({ resource_id: "WAT-boiling-R01", title: "Boiling Water Quick Reference", resource_type: "checklist", resource_origin: "generated", file_format: "PDF", source_url: null, license: null, redistribution: null, module_id: "WAT-boiling", module_title: "Boiling Water", artifact_available: true });
    if (pathname === "/modules/WAT-boiling") return json({ module_id: "WAT-boiling", title: "Boiling Water", description: "Purification", category: "water", subcategory: "boiling", difficulty: "beginner", estimated_duration: 20, content_version: 1, knowledge_items: [], lesson: null, quiz: null, resources: [], progress: { lesson_completed: false, quiz_best_score: null, completed: false } });
    return json({ error: { code: "FORBIDDEN", message: "Fixture not available", request_id: "local-test" } }, 403);
  });
  return { mutations, billing };
}

test("local mock plan testing never loads Stripe and Free cannot open paid PDFs", async ({ page }) => {
  const backend = await localApi(page);
  await page.goto("/resources/WAT-boiling-R01");
  await expect(page.getByRole("heading", { name: "Boiling Water Quick Reference" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open artifact", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Download with Survivor" }).click();
  await expect(page.getByRole("note")).toContainText("Local testing: payments are disabled");
  await page.getByRole("button", { name: "Choose Operator", exact: true }).click();
  await expect.poll(() => backend.mutations.length).toBe(1);
  expect(backend.mutations).toEqual([{ plan_code: "operator" }]);
  await page.goto("/resources/WAT-boiling-R01");
  await expect(page.getByRole("link", { name: "Open artifact", exact: true })).toHaveAttribute("href", /disposition=inline/);
  await expect(page.getByRole("link", { name: "Download", exact: true })).toHaveAttribute("href", /disposition=attachment/);
  expect(backend.billing).toEqual([]);
});

test("a denied local plan change stays denied and never falls back to Stripe", async ({ page }) => {
  const backend = await localApi(page, true);
  await page.goto("/plans");
  await page.getByRole("button", { name: "Choose Operator", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("verified mock account without a provider subscription");
  await expect(page.getByRole("button", { name: "Choose Operator", exact: true })).toBeEnabled();
  expect(backend.billing).toEqual([]);
});
