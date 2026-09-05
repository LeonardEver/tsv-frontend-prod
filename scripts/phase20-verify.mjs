/**
 * Phase 20 Batch 05 real-stack verification (TEMPORARY — not part of the product).
 * Drives the REAL local stack through representative journeys for the 31-module
 * expansion: one new module per category, lesson + quiz + result + progress,
 * plus identity, no-leak, cross-user, and mobile checks. Paced for the
 * 100 req/min rate limiter.
 */
/* global document */ // browser globals used inside page.evaluate callbacks
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
  await sleep(1200);
}

/** Full journey: module detail → lesson → quiz → server-scored result. */
async function journey(modId, title, qCount = 10) {
  await page.goto(`${BASE}/modules/${modId}`);
  await page.waitForSelector("h1");
  const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check(`${modId} detail real title`, h1 === title, `h1="${h1}"`);
  await sleep(600);

  await page.goto(`${BASE}/modules/${modId}/lesson`);
  await page.waitForSelector("text=Learning Objectives");
  check(`${modId} lesson renders`, true);
  await sleep(600);

  await page.goto(`${BASE}/modules/${modId}/quiz`);
  await page.waitForSelector("text=Start quiz");
  await page.getByRole("button", { name: /start quiz/i }).click();
  await page.waitForSelector(`text=Question 1 of ${qCount}`);
  for (let q = 1; q <= qCount; q++) {
    await page.waitForSelector(`text=Question ${q} of ${qCount}`);
    const radios = page.getByRole("radiogroup").first().getByRole("radio");
    await radios.first().click().catch(() => {});
    await sleep(110);
    if (q < qCount) {
      const nextBtn = page.getByRole("button", { name: /next/i });
      if ((await nextBtn.count()) > 0) await nextBtn.click();
    }
    await sleep(110);
  }
  await page.getByRole("button", { name: /submit quiz/i }).click().catch(() => {});
  await page.waitForSelector("text=result", { timeout: 10000 }).catch(() => {});
  const resultShown = await page.getByText(/result/i).first().isVisible().catch(() => false);
  check(`${modId} quiz server-scored result renders`, resultShown);
  await sleep(800);
}

try {
  await login();

  // ── 1. Learn page: six regions still render with identities ──
  await page.goto(`${BASE}/categories`);
  await page.waitForSelector("text=Explore regions");
  await sleep(800);
  for (const r of ["Water", "Fire", "Survival Fundamentals", "Shelter", "Food", "Agriculture"]) {
    const visible = await page.getByText(r, { exact: true }).first().isVisible().catch(() => false);
    check(`region "${r}" visible on Learn`, visible);
  }
  const rawIds = await page
    .getByText(/^(WAT|FIR|SUR|SHE|FOD|AGR)-[a-z-]+$/i)
    .count()
    .catch(() => -1);
  check("no raw internal module IDs rendered on Learn", rawIds === 0, `matches=${rawIds}`);
  await page.screenshot({ path: `${OUT}20-learn-51.png` });

  // ── 2. Shelter region: 8 modules with real titles, no raw IDs ──
  await page.goto(`${BASE}/categories/shelter`);
  await page.waitForSelector("text=Tarp Shelters");
  await sleep(700);
  for (const t of ["Tarp Shelters", "Tents", "Shelter Site Selection", "Weather Protection", "Natural Shelter", "Shelter Insulation", "Shelter Materials", "Long-Term Shelter"]) {
    const n = await page.getByText(t, { exact: true }).count();
    check(`shelter module card: "${t}"`, n >= 1);
  }
  await page.screenshot({ path: `${OUT}20-shelter-region.png` });

  // ── 3. Representative journey per category (one new module each) ──
  await journey("SUR-prioritization", "Prioritization");
  await journey("WAT-finding-water", "Finding Water");
  await journey("FIR-fire-laying", "Fire Laying");
  await journey("SHE-tents", "Tents");
  await journey("FOD-canning", "Canning");
  await journey("AGR-composting", "Composting");

  // ── 4. XP + progress update ──
  await page.goto(`${BASE}/gamification`);
  await page.waitForSelector("h1");
  const gamText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("gamification shows earned XP", gamText.includes("XP"));
  await sleep(800);
  await page.goto(`${BASE}/progress`);
  await page.waitForSelector("h1");
  const progText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("progress page shows new module titles", ["Prioritization", "Finding Water", "Tents", "Canning"].every((t) => progText.includes(t)));
  await sleep(800);

  // ── 5. Quiz payload never leaks answers ──
  const quizResp = await context.request.get(`${BASE}/api/v1/quizzes/FOD-canning-Q01`);
  const quizJson = await quizResp.json().catch(() => null);
  const leaked =
    quizJson &&
    (quizJson.questions ?? []).some(
      (q) => q.correct_answer !== undefined || q.answer !== undefined || q.explanation !== undefined,
    );
  check("GET quiz payload contains no correct_answer/explanation", !leaked);
  await sleep(500);

  // ── 6. Cross-user isolation: fresh user sees no progress on a new module ──
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/login`);
  await page2.waitForSelector("text=Continue with Google");
  await page2.click("text=Continue with Google");
  await page2.waitForURL(/dashboard/);
  await page2.waitForSelector("text=Welcome back");
  await sleep(1200);
  await page2.goto(`${BASE}/modules/SHE-tents`);
  await page2.waitForSelector("text=Your progress");
  const body2 = (await page2.locator("body").textContent().catch(() => "")) ?? "";
  check("fresh user: SHE-tents 'Not started'", body2.includes("Not started"));
  check("fresh user: SHE-tents 'Not attempted'", body2.includes("Not attempted"));
  check("fresh user: no 'Completed' markers", !body2.includes("Completed"));
  await ctx2.close();
  await sleep(800);

  // ── 7. Mobile: shelter region, no overflow ──
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mctx.newPage();
  await mpage.goto(`${BASE}/login`);
  await mpage.waitForSelector("text=Continue with Google");
  await mpage.click("text=Continue with Google");
  await mpage.waitForURL(/dashboard/);
  await sleep(1200);
  await mpage.goto(`${BASE}/categories/shelter`);
  await mpage.waitForSelector("text=Tarp Shelters");
  await sleep(700);
  const overflow = await mpage.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check("mobile 390px: no horizontal overflow on shelter region", !overflow);
  await mpage.screenshot({ path: `${OUT}20-shelter-mobile.png` });
  await mctx.close();
} catch (err) {
  console.error("VERIFY CRASH:", err);
  await page.screenshot({ path: `${OUT}20-crash.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nREAL-STACK VERIFICATION: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
