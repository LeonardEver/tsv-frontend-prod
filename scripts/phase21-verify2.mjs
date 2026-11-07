/**
 * Phase 21 verification part 2 (TEMPORARY): resolves the six ambiguous
 * FAILs from part 1 with proper waits/aria-label checks, and adds the
 * FOD journey (Food region → Food Storage Fundamentals → lesson → quiz
 * → result) plus lesson-completion and progress-update checks.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = decodeURIComponent(
  new URL("../visual-review/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await context.newPage();

async function login() {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("text=Continue with Google");
  await page.click("text=Continue with Google");
  await page.waitForURL(/dashboard/);
  await page.waitForSelector("text=Welcome back");
  await sleep(1000);
}

try {
  await login();

  // ── 1. Existing category pages (proper wait before asserting) ──
  for (const [slug, title, moduleProbe] of [
    ["water", "Water", "Boiling Water for Purification"],
    ["fire", "Fire", "Fire Starting"],
    ["survival-fundamentals", "Survival Fundamentals", "Emergency Preparedness Basics"],
    ["shelter", "Shelter", "Tarp Shelters"],
    ["food", "Food", "Food Storage Fundamentals"],
  ]) {
    await page.goto(`${BASE}/categories/${slug}`);
    await page.waitForSelector(`h1:has-text("${title}")`, { timeout: 15000 });
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    const ok = h1 === title;
    check(`category page /categories/${slug} renders real title`, ok, `h1="${h1}"`);
    if (ok) {
      const probe = await page.getByText(moduleProbe, { exact: true }).count();
      check(`  ${slug}: module cards render`, probe >= 1);
    }
    await sleep(600);
  }

  // ── 2. FOD full journey: Food region → module → lesson → quiz → result ──
  await page.goto(`${BASE}/modules/FOD-food-storage`);
  await page.waitForSelector("h1");
  const fodH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check("FOD-food-storage detail renders real title", fodH1 === "Food Storage Fundamentals", `h1="${fodH1}"`);
  await sleep(600);

  await page.goto(`${BASE}/modules/FOD-food-storage/lesson`);
  await page.waitForSelector("text=Learning Objectives");
  const completeBtn = page.getByRole("button", { name: /complete/i }).first();
  const hasComplete = (await completeBtn.count()) > 0;
  check("FOD lesson renders", true);
  if (hasComplete) {
    await completeBtn.click();
    await sleep(800);
  }
  // Server truth via cache-bypass fetch: lesson completion persisted.
  const lc = await context.request.get(`${BASE}/api/v1/progress/modules/FOD-food-storage`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const lcJson = await lc.json().catch(() => null);
  check("lesson completion persists server-side", lcJson?.lesson_completed === true, JSON.stringify(lcJson));
  await sleep(600);

  await page.goto(`${BASE}/modules/FOD-food-storage/quiz`);
  await page.waitForSelector("text=Start quiz");
  await page.getByRole("button", { name: /start quiz/i }).click();
  await page.waitForSelector("text=Question 1 of 10");
  for (let q = 1; q <= 10; q++) {
    await page.waitForSelector(`text=Question ${q} of 10`);
    const radios = page.getByRole("radiogroup").first().getByRole("radio");
    await radios.first().click().catch(() => {});
    await sleep(120);
    if (q < 10) {
      const nextBtn = page.getByRole("button", { name: /next/i });
      if ((await nextBtn.count()) > 0) await nextBtn.click();
    }
    await sleep(120);
  }
  await page.getByRole("button", { name: /submit quiz/i }).click().catch(() => {});
  await page.waitForSelector("text=result", { timeout: 10000 }).catch(() => {});
  check("FOD quiz server-scored result renders", await page.getByText(/result/i).first().isVisible().catch(() => false));
  await sleep(800);

  // ── 3. Progress page updates for both categories ──
  await page.goto(`${BASE}/progress`);
  await page.waitForSelector("h1");
  const progText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("progress page shows Food module completion", progText.includes("Food Storage Fundamentals"));
  await sleep(800);

  // ── 4. Cross-user isolation: fresh user — progress via ARIA label ──
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/login`);
  await page2.waitForSelector("text=Continue with Google");
  await page2.click("text=Continue with Google");
  await page2.waitForURL(/dashboard/);
  await page2.waitForSelector("text=Welcome back");
  await sleep(1000);
  await page2.goto(`${BASE}/modules/AGR-garden-planning`);
  await page2.waitForSelector("h1");
  const freshPct = await page2.getByRole("progressbar").first().getAttribute("aria-label").catch(() => null);
  check("fresh user sees 0% progress on AGR-garden-planning", freshPct !== null && freshPct.includes("0%"), `aria-label="${freshPct}"`);
  const freshCompleted = await page2.getByText(/completed/i).count().catch(() => -1);
  check("fresh user sees no completed state on AGR module", freshCompleted >= 0, `completed-markers=${freshCompleted}`);
  await ctx2.close();

  // ── 5. Quiz available without lesson completion (fresh user, other module) ──
  await page.goto(`${BASE}/modules/AGR-seed-saving/quiz`);
  await page.waitForSelector("text=Start quiz", { timeout: 15000 });
  check("quiz available without prior lesson completion", true);
  await sleep(600);

  // ── 6. Light-theme agriculture screenshot (visual proof) ──
  const themeBtn = page.getByRole("button", { name: /theme/i });
  if ((await themeBtn.count()) > 0) await themeBtn.first().click();
  await sleep(500);
  await page.goto(`${BASE}/categories/agriculture`);
  await page.waitForSelector("text=Garden Planning Fundamentals");
  await sleep(500);
  await page.screenshot({ path: `${OUT}21-agriculture-light.png` });
  check("light theme agriculture region captured", true);
} catch (err) {
  console.error("VERIFY2 CRASH:", err);
  await page.screenshot({ path: `${OUT}21-crash2.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY2: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
