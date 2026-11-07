/**
 * Phase 23 visual review helper (TEMPORARY — not part of the product).
 * Drives the REAL local stack (Vite 5173 + backend 3000 with the mock
 * OIDC provider) and captures every major migrated route at desktop and
 * mobile, including a returning-user state built from real API actions.
 * Output lands in visual-review/phase23/ (the Phase 24 baseline in
 * visual-review/ remains for comparison).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = decodeURIComponent(
  new URL("../visual-review/phase23/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });
// The dev backend rate-limits at 100 req/min per IP — requests cluster
// at navigation moments, so spread pages ~9s apart (≈85 req per run).
const pause = () => new Promise((r) => setTimeout(r, 9000));
const goto = async (path) => {
  await pause();
  await page.goto(`${BASE}${path}`);
};

// ── Login ──
await page.goto(`${BASE}/login`);
await page.waitForSelector("text=Continue with Google");
await shot("01-login");

// ── Login via the mock provider (real redirect chain) ──
await page.click("text=Continue with Google");
await page.waitForURL(/dashboard/);
await page.waitForSelector("text=Welcome back");
await shot("02-dashboard-new-user");

// ── Build real activity through the API (server-authoritative).
//    Only the lesson completes here: the quiz quota (Free plan = 1/day)
//    must stay untouched so the UI quiz can submit below. ──
await context.request.post(`${BASE}/api/v1/lessons/WAT-boiling-L01/complete`, {
  data: { last_position: 0 },
});

// ── Returning-user surfaces ──
await goto("/dashboard");
await page.waitForSelector("text=Your next mission");
await shot("03-dashboard-returning");

await goto("/categories");
await page.waitForSelector("text=Explore Regions");
await shot("04-learn");

await goto("/categories/water");
await page.waitForSelector("text=Boiling Water for Purification");
await shot("05-category-water");

await goto("/modules/WAT-boiling");
await page.waitForSelector("text=Field Resources");
await shot("06-module-detail");

await goto("/modules/WAT-boiling/lesson");
await page.waitForSelector("text=Learning objectives");
await shot("07-lesson");

// Quiz intro
await goto("/modules/WAT-boiling/quiz");
await page.waitForSelector("text=Start Field Test");
await shot("08-quiz-intro");

// Quiz active (one question answered)
await page.click("text=Start Field Test");
try {
  await page.waitForSelector("role=radiogroup", { timeout: 15000 });
} catch {
  const text = await page.locator("body").innerText();
  console.error("NO RADIOGROUP. Page text:", text.slice(0, 400));
  await shot("debug-quiz-state");
  throw new Error("quiz active state never appeared");
}
await page.locator("role=radiogroup >> label").first().click();
await shot("09-quiz-active");

// Submit through the UI (answer the rest via UI)
while ((await page.getByRole("button", { name: /next/i }).count()) > 0) {
  await page.getByRole("button", { name: /next/i }).click();
}
await page.getByRole("button", { name: /submit field test/i }).click();
await page.waitForSelector("text=Field test complete");
await shot("10-quiz-result");

await goto("/progress");
await page.waitForSelector("text=Your Expedition");
await shot("11-progress");

await goto("/gamification");
await page.waitForSelector("text=Achievements");
await shot("12-gamification");

await goto("/profile");
await page.waitForSelector("text=Member since");
await shot("13-profile");

await goto("/plans");
await page.waitForSelector("text=Choose Your Plan");
await shot("14-plans");

await goto("/community");
// The mock-provider user is on the Free plan — the honest LockedState
// gate is the expected visual (a paid-plan shot would need a plan switch).
await page.waitForSelector("text=Community is available with Survivor");
await shot("15-community-free-gate");

await goto("/resources/WAT-boiling-R01");
await page.waitForSelector("text=Open artifact");
await shot("16-resource");

// ── Mobile (Pixel 7-ish) ──
const mobile = await browser.newContext({ viewport: { width: 412, height: 915 } });
const mpage = await mobile.newPage();
const mshot = (name) => mpage.screenshot({ path: `${OUT}${name}.png`, fullPage: false });

await mpage.goto(`${BASE}/login`);
await mpage.click("text=Continue with Google");
await mpage.waitForURL(/dashboard/);
await mpage.waitForSelector("text=Welcome back");
await mshot("17-mobile-dashboard");

await pause(); await mpage.goto(`${BASE}/categories`);
await mpage.waitForSelector("text=Explore Regions");
await mshot("18-mobile-learn");

await pause(); await mpage.goto(`${BASE}/modules/WAT-boiling/lesson`);
await mpage.waitForSelector("text=Learning objectives");
await mshot("19-mobile-lesson");

await pause(); await mpage.goto(`${BASE}/modules/WAT-boiling/quiz`);
await mpage.waitForSelector("text=Start Field Test");
await mpage.click("text=Start Field Test");
await mpage.waitForSelector("role=radiogroup");
await mshot("20-mobile-quiz");

await pause(); await mpage.goto(`${BASE}/categories/water`);
await mpage.waitForSelector("text=Boiling Water for Purification");
await mshot("21-mobile-category");

await pause(); await mpage.goto(`${BASE}/community`);
await mpage.waitForSelector("text=Community is available with Survivor");
await mshot("22-mobile-community-free-gate");

await pause(); await mpage.goto(`${BASE}/plans`);
await mpage.waitForSelector("text=Choose Your Plan");
await mshot("23-mobile-plans");

await browser.close();
console.log("Phase 23 screenshots written to", OUT);
