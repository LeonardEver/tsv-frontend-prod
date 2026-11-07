/**
 * Phase 16.5 visual review helper (TEMPORARY — not part of the product).
 * Drives the REAL local stack (Vite 5173 + backend 3000 with the mock
 * OIDC provider) and captures the 14 review surfaces, including a
 * returning-user state built from real API actions.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = decodeURIComponent(
  new URL("../visual-review/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });

// ── Login ──
await page.goto(`${BASE}/login`);
await page.waitForSelector("text=Continue with Google");
await shot("01-login");

// ── Login via the mock provider (real redirect chain) ──
await page.click("text=Continue with Google");
await page.waitForURL(/dashboard/);
await page.waitForSelector("text=Welcome back");
await shot("02-dashboard-new-user");

// ── Build real activity through the API (server-authoritative) ──
await context.request.post(`${BASE}/api/v1/lessons/WAT-boiling-L01/complete`, {
  data: { last_position: 0 },
});
const attempt = await context.request.post(`${BASE}/api/v1/quizzes/WAT-boiling-Q01/attempts`, {
  headers: { "Idempotency-Key": "visual-review-attempt-1" },
});
const attemptId = (await attempt.json()).attempt_id;
await context.request.post(`${BASE}/api/v1/quizzes/WAT-boiling-Q01/attempts/${attemptId}/answers`, {
  data: {
    idempotency_key: "visual-review-submit-1",
    answers: [
      { question_id: "q01", answer: "C" },
      { question_id: "q02", answer: "B" },
      { question_id: "q03", answer: "D" },
    ],
  },
});

// ── Returning-user surfaces ──
await page.goto(`${BASE}/dashboard`);
await page.waitForSelector("text=Your next mission");
await shot("03-dashboard-returning");

await page.goto(`${BASE}/categories`);
await page.waitForSelector("text=Explore regions");
await shot("04-categories");

await page.goto(`${BASE}/categories/water`);
await page.waitForSelector("text=Boiling Water for Purification");
await shot("05-category-water");

await page.goto(`${BASE}/modules/WAT-boiling`);
await page.waitForSelector("text=Field resources");
await shot("06-module-detail");

await page.goto(`${BASE}/modules/WAT-boiling/lesson`);
await page.waitForSelector("text=Field manual");
await shot("07-lesson");

// Quiz intro
await page.goto(`${BASE}/modules/WAT-boiling/quiz`);
await page.waitForSelector("text=Start Quiz");
await shot("08-quiz-intro");

// Quiz active (one question answered)
await page.click("text=Start Quiz");
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
await page.getByRole("button", { name: /submit quiz/i }).click();
await page.waitForSelector("text=— Result");
await page.waitForSelector("text=earned for this field test");
await shot("10-quiz-result");

await page.goto(`${BASE}/progress`);
await page.waitForSelector("text=Overall");
await shot("11-progress");

await page.goto(`${BASE}/gamification`);
await page.waitForSelector("text=Achievements");
await shot("12-gamification");

await page.goto(`${BASE}/resources/WAT-boiling-R01`);
try {
  await page.waitForSelector("text=Ready in the field", { timeout: 10000 });
} catch {
  const text = await page.locator("body").innerText();
  console.error("RESOURCE PAGE TEXT:", text.slice(0, 500));
  await shot("debug-resource");
}
await shot("13-resource");

await page.goto(`${BASE}/profile`);
await page.waitForSelector("text=Your account and session");
await shot("14-profile");

// ── Mobile (Pixel 7-ish) ──
const mobile = await browser.newContext({ viewport: { width: 412, height: 915 } });
const mpage = await mobile.newPage();
const mshot = (name) => mpage.screenshot({ path: `${OUT}${name}.png`, fullPage: false });

await mpage.goto(`${BASE}/login`);
await mpage.click("text=Continue with Google");
await mpage.waitForURL(/dashboard/);
await mpage.waitForSelector("text=Welcome back");
await mshot("15-mobile-dashboard");

await mpage.goto(`${BASE}/modules/WAT-boiling/quiz`);
await mpage.waitForSelector("text=Start Quiz");
await mpage.click("text=Start Quiz");
await mpage.waitForSelector('role=radiogroup');
await mshot("16-mobile-quiz");

await browser.close();
console.log("Screenshots written to", OUT);
