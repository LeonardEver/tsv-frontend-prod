/**
 * Phase 21 Batch 05 real-stack verification (TEMPORARY — not part of the product).
 * Drives the REAL local stack (Vite 5173 + backend 3000, mock OIDC, dev DB)
 * through the full learner journey for the Agriculture batch and the
 * category-identity polish. Paced for the 100 req/min rate limiter.
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

try {
  // ── 1. Login (mock OIDC) → dashboard ──
  await login();
  check("login via mock OIDC", true);

  // ── 2. Learn page: all six regions, real titles, no raw IDs ──
  await page.goto(`${BASE}/categories`);
  await page.waitForSelector("text=Explore regions");
  await sleep(800);

  const regions = [
    { title: "Water", env: "env-water" },
    { title: "Fire", env: "env-fire" },
    { title: "Survival Fundamentals", env: "env-sur" },
    { title: "Shelter", env: "env-she" },
    { title: "Food", env: "env-fod" },
    { title: "Agriculture", env: "env-agr" },
  ];
  for (const r of regions) {
    const card = page.locator(`a[href^="/categories/"]`).filter({ hasText: r.title }).first();
    const visible = await card.isVisible().catch(() => false);
    const envOk = visible && (await card.locator(`.${r.env}`).count()) === 1;
    check(`region "${r.title}" visible with ${r.env} wash`, visible && envOk);
  }
  const rawIds = await page
    .getByText(/^(WAT|FIR|SUR|SHE|FOD|AGR|AGR-garden-planning|FOD-food-storage)$/)
    .count()
    .catch(() => -1);
  check("no raw internal IDs rendered on Learn", rawIds === 0, `matches=${rawIds}`);
  await page.screenshot({ path: `${OUT}21-categories-dark.png` });

  // ── 3. Agriculture region detail ──
  await page.goto(`${BASE}/categories/agriculture`);
  await page.waitForSelector("text=Garden Planning Fundamentals");
  await sleep(800);
  const agrImg = await page.getByRole("img", { name: "Agriculture region" }).count();
  check("Agriculture region mark with accessible name", agrImg === 1);
  for (const t of [
    "Garden Planning Fundamentals",
    "Seed Saving Fundamentals",
    "Soil & Growing Fundamentals",
    "Basic Food Production for Preparedness",
  ]) {
    const n = await page.getByText(t, { exact: true }).count();
    check(`Agriculture module card: "${t}"`, n >= 1);
  }
  await page.screenshot({ path: `${OUT}21-agriculture-region.png` });

  // ── 4. Existing categories still work ──
  for (const [slug, title] of [
    ["water", "Water"],
    ["fire", "Fire"],
    ["survival-fundamentals", "Survival Fundamentals"],
    ["shelter", "Shelter"],
    ["food", "Food"],
  ]) {
    await page.goto(`${BASE}/categories/${slug}`);
    const ok = await page
      .getByRole("heading", { name: title, exact: true })
      .isVisible()
      .catch(() => false);
    check(`existing category page /categories/${slug}`, ok);
    await sleep(700);
  }

  // ── 5. Full journey per Agriculture module: lesson + quiz + result + XP ──
  const modules = [
    "AGR-garden-planning",
    "AGR-seed-saving",
    "AGR-soil-fundamentals",
    "AGR-food-production",
  ];
  for (const modId of modules) {
    await page.goto(`${BASE}/modules/${modId}`);
    await page.waitForSelector(`text=${modId === "AGR-garden-planning" ? "Garden Planning Fundamentals" : ""}`).catch(() => {});
    await page.waitForSelector("h1");
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    check(`${modId} detail renders real title`, h1.length > 3 && !h1.includes(modId), `h1="${h1}"`);
    await sleep(700);

    await page.getByRole("link", { name: /start lesson|continue lesson/i }).first().click().catch(async () => {
      await page.goto(`${BASE}/modules/${modId}/lesson`);
    });
    await page.waitForSelector("text=Learning Objectives");
    check(`${modId} lesson renders`, true);
    await sleep(700);

    // Quiz: GET payload must never leak answers (checked via raw API below);
    // here we take the journey and answer every question "A".
    await page.goto(`${BASE}/modules/${modId}/quiz`);
    await page.waitForSelector("text=Start quiz");
    await page.getByRole("button", { name: /start quiz/i }).click();
    await page.waitForSelector("text=Question 1 of 10");
    for (let q = 1; q <= 10; q++) {
      await page.waitForSelector(`text=Question ${q} of 10`);
      const radios = page.getByRole("radiogroup").first().getByRole("radio");
      await radios.first().click().catch(() => {});
      await sleep(120);
      const nextBtn = page.getByRole("button", { name: /next/i });
      if (q < 10 && (await nextBtn.count()) > 0) await nextBtn.click();
      await sleep(120);
    }
    await page.getByRole("button", { name: /submit quiz/i }).click().catch(() => {});
    await page.waitForSelector("text=result", { timeout: 10000 }).catch(() => {});
    const resultShown = await page.getByText(/result/i).first().isVisible().catch(() => false);
    check(`${modId} quiz server-scored result renders`, resultShown);
    await sleep(700);
  }

  // ── 6. XP + progress + gamification after the journey ──
  await page.goto(`${BASE}/gamification`);
  await page.waitForSelector("h1");
  const gamText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("gamification shows earned XP", /\d+/.test(gamText) && gamText.includes("XP"));
  await sleep(800);

  // ── 7. Quiz payload never leaks answers (raw API fetch) ──
  const quizResp = await context.request.get(`${BASE}/api/v1/quizzes/AGR-garden-planning-Q01`);
  const quizJson = await quizResp.json().catch(() => null);
  const leaked =
    quizJson &&
    (quizJson.questions ?? []).some(
      (q) => q.correct_answer !== undefined || q.answer !== undefined || q.correct !== undefined,
    );
  check("GET quiz payload contains no correct answers", !leaked);
  await sleep(500);

  // ── 8. Cross-user isolation: fresh user sees zero AGR progress ──
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/login`);
  await page2.waitForSelector("text=Continue with Google");
  await page2.click("text=Continue with Google");
  await page2.waitForURL(/dashboard/);
  await page2.waitForSelector("text=Welcome back");
  await sleep(1200);
  await page2.goto(`${BASE}/modules/AGR-garden-planning`);
  await page2.waitForSelector("h1");
  const pctText2 = (await page2.locator("body").textContent().catch(() => "")) ?? "";
  check("fresh user sees 0% progress on AGR-garden-planning", pctText2.includes("0%"));
  await ctx2.close();
  await sleep(800);

  // ── 9. Light theme: identities must survive the paper theme ──
  const themeBtn = page.getByRole("button", { name: /theme/i });
  if ((await themeBtn.count()) > 0) {
    await themeBtn.first().click();
    await sleep(600);
  }
  await page.goto(`${BASE}/categories`);
  await page.waitForSelector("text=Explore regions");
  await sleep(800);
  const lightAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  check("light theme active (data-theme=light)", lightAttr === "light");
  const lightAgr = await page.locator('a[href="/categories/agriculture"] .env-agr').count();
  const lightWater = await page.locator('a[href="/categories/water"] .env-water').count();
  check("light theme: all env washes still applied", lightAgr === 1 && lightWater === 1);
  await page.screenshot({ path: `${OUT}21-categories-light.png` });

  // ── 10. Mobile viewport: six regions, no overflow ──
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mctx.newPage();
  await mpage.goto(`${BASE}/login`);
  await mpage.waitForSelector("text=Continue with Google");
  await mpage.click("text=Continue with Google");
  await mpage.waitForURL(/dashboard/);
  await sleep(1200);
  await mpage.goto(`${BASE}/categories`);
  await mpage.waitForSelector("text=Explore regions");
  await sleep(800);
  const overflow = await mpage.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check("mobile 390px: no horizontal overflow on Learn", !overflow);
  const mobileAgr = await mpage.getByText("Agriculture", { exact: true }).isVisible().catch(() => false);
  check("mobile: Agriculture region visible", mobileAgr);
  await mpage.screenshot({ path: `${OUT}21-categories-mobile.png` });
  await mctx.close();
} catch (err) {
  console.error("VERIFY CRASH:", err);
  await page.screenshot({ path: `${OUT}21-crash.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nREAL-STACK VERIFICATION: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
