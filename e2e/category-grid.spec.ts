import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const artwork = JSON.parse(readFileSync(new URL("../docs/module-artwork.json", import.meta.url), "utf8")) as { scenes: Record<string, string> };

const modules = [
  { module_id: "SUR-emergency-planning", title: "Household Emergency Planning", subcategory: "emergency-planning" },
  { module_id: "SUR-preparedness", title: "Emergency Preparedness Basics", subcategory: "preparedness" },
  { module_id: "SUR-prioritization", title: "Prioritization", subcategory: "prioritization" },
  { module_id: "SUR-risk-assessment", title: "Risk Assessment", subcategory: "risk-assessment" },
  { module_id: "SUR-situational-awareness", title: "Situational Awareness", subcategory: "situational-awareness" },
  { module_id: "SUR-survival-psychology", title: "Survival Psychology", subcategory: "survival-psychology" },
].map((row, index) => ({ ...row, category: "survival-fundamentals", difficulty: "beginner", estimated_duration: 20, description: "Build practical skills for the field.", completed: index < 3, progress_pct: index < 3 ? 100 : 0 }));

function mockCatalog(page: Page) {
  return page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/v1/auth/me") return json({ user_id: 1, email: "learner@example.com", display_name: "Learner", created_at: "2026-11-01T00:00:00Z" });
    if (path === "/api/v1/categories") return json({ categories: [{ slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 6, completed_count: 3 }] });
    if (path === "/api/v1/categories/survival-fundamentals") return json({ slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", subcategories: [{ slug: "emergency-decision-making", modules: [] }, ...modules.map((row) => ({ slug: row.subcategory, modules: [row] }))] });
    if (path === "/api/v1/modules") return json({ modules, pagination: { next_cursor: null, has_more: false, page_size: 6 } });
    if (path === "/api/v1/gamification") return json({ total_xp: 225, level: 1, level_title: "Novice", xp_to_next_level: 75, current_streak: 2, longest_streak: 2, achievements_earned: 0, recent_transactions: [] });
    if (path === "/api/v1/usage") return json({ plan_name: "Free", lesson_completions: 0, quiz_attempts: 0, limits: { daily_lessons: 1, daily_quizzes: 1 } });
    if (path === "/api/v1/subscription") return json({ plan_code: "free", plan_name: "Free", entitlements: { daily_lessons: 1, daily_quizzes: 1, resource_download: false, quiz_before_lesson: false, community: false } });
    const mod = modules.find((row) => path === `/api/v1/modules/${row.module_id}`);
    if (mod) return json({ ...mod, content_version: 1, knowledge_items: [], lesson: { lesson_id: `${mod.module_id}-L01`, title: mod.title, estimated_minutes: 20, completed: mod.completed }, quiz: { quiz_id: `${mod.module_id}-Q01`, title: `${mod.title} Quiz`, question_count: 10, best_score: null, attempt_count: 0 }, resources: [], progress: { lesson_completed: mod.completed, quiz_best_score: null, completed: mod.completed } });
    const lesson = modules.find((row) => path === `/api/v1/lessons/${row.module_id}-L01`);
    if (lesson) return json({ lesson_id: `${lesson.module_id}-L01`, module_id: lesson.module_id, title: lesson.title, estimated_minutes: 20, content_version: 1, sections: [{ type: "introduction", heading: "Introduction", content: "Practice the skills you need before an emergency." }], progress: { completed: lesson.completed, last_position: null } });
    const progress = modules.find((row) => path === `/api/v1/progress/modules/${row.module_id}`);
    if (progress) return json({ module_id: progress.module_id, lesson_completed: progress.completed, quiz_attempts: 0, quiz_best_score: null, quiz_last_passed: null, lo_performance: [] });
    return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Not available", request_id: "catalog-review" } }) });
  });
}

test("desktop and mobile: one shared grid, six unique covers, no empty category headers", async ({ page }, testInfo) => {
  await mockCatalog(page);
  const mobile = testInfo.project.name === "mobile-chromium";
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1848, height: 1100 });
  await page.goto("/categories/survival-fundamentals");
  const section = page.getByRole("region", { name: "Region missions" });
  const cards = section.getByRole("link");
  await expect(cards).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Emergency decision making" })).toHaveCount(0);
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  if (!first || !second) throw new Error("Missing mission card layout");
  if (mobile) expect(second.y).toBeGreaterThan(first.y + first.height);
  else { expect(Math.abs(second.y - first.y)).toBeLessThan(2); expect(second.x).toBeGreaterThan(first.x + first.width); }
  const sources = await section.locator("img").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(new Set(sources).size).toBe(6);
  for (const image of await section.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.screenshot({ path: `visual-review/module-covers/catalog-${mobile ? "mobile" : "desktop"}.png`, animations: "disabled", fullPage: !mobile });
  const cover = await cards.nth(0).locator("img").getAttribute("src");
  if (!cover) throw new Error("Mission cover source missing");
  await cards.nth(0).click();
  await expect(page.locator("main img").first()).toHaveAttribute("src", cover);
  await page.getByRole("link", { name: /review field manual/i }).click();
  await expect(page.locator("article > img")).toHaveAttribute("src", cover);
});

test("all 80 cover files load and can be reviewed as four contact sheets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One desktop contact sheet per group is sufficient");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/robots.txt");
  const ids = Object.keys(artwork.scenes);
  for (let offset = 0; offset < ids.length; offset += 20) {
    const group = ids.slice(offset, offset + 20);
    await page.setContent(`<html><head><style>body{margin:0;padding:24px;background:#101616;color:#eef2ec;font:14px system-ui}h1{font-size:22px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}figure{margin:0;overflow:hidden;border-radius:8px;background:#1b2422}img{display:block;width:100%;aspect-ratio:1.6;object-fit:cover}figcaption{padding:10px;font-weight:600;font-size:12px}</style></head><body><h1>Module artwork — ${offset + 1}–${offset + group.length}</h1><div class="grid">${group.map((id) => `<figure><img src="/src/assets/modules/${id}.jpg" alt="${id}"><figcaption>${id}</figcaption></figure>`).join("")}</div></body></html>`);
    for (const image of await page.locator("img").all()) {
      await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: `visual-review/module-covers/contact-sheet-${offset / 20 + 1}.png`, fullPage: true });
  }
});
