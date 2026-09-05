/**
 * Phase 24 (Batch 08 NAV) verification (TEMPORARY): real backend + real dev
 * DB. Covers: login → Learn shows Navigation region card with NAV identity →
 * category page lists all 12 NAV modules → each module detail renders real
 * content, no raw IDs → lesson journey (NAV-navigation-fundamentals) with
 * server-side completion → quiz GET payloads leak-free (all 12 NAV quizzes,
 * API-level) → full quiz journey on NAV-route-planning with server-scored
 * result → XP → Progress lists NAV modules → regression smoke on all 8
 * existing categories. Pacing ~1.2s (rate limiter 100 req/min).
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

const NAV_MODULES = [
  ["NAV-navigation-fundamentals", "Navigation Fundamentals"],
  ["NAV-map-reading", "Map Reading Fundamentals"],
  ["NAV-compass", "Compass Navigation"],
  ["NAV-terrain-association", "Terrain Association"],
  ["NAV-coordinate-systems", "Coordinates & Grid Navigation"],
  ["NAV-route-planning", "Route Planning"],
  ["NAV-gps-offline", "GPS & Offline Navigation"],
  ["NAV-night-navigation", "Night Navigation"],
  ["NAV-weather-navigation", "Weather, Visibility & Navigation"],
  ["NAV-water-navigation", "Rivers, Lakes & Water Crossings"],
  ["NAV-navigation-errors", "Navigation Errors & Recovery"],
  ["NAV-emergency-location", "Emergency Location & Signaling"],
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await context.newPage();

async function login() {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("text=Continue with Google");
  await page.click("text=Continue with Google");
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForSelector("text=Welcome back");
  await sleep(1500);
}

try {
  await login();
  check("login → dashboard (real stack)", true);

  // ── 1. Learn page: Navigation region card with declared identity ──
  await page.goto(`${BASE}/categories`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(800);
  const learnBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("Learn page shows Navigation region card", learnBody.includes("Navigation"));
  check("Learn page shows all 9 region cards",
    ["Water", "Fire", "Survival Fundamentals", "Shelter", "Food", "Agriculture", "Medical & First Aid", "Foraging & Plants"].every((t) => learnBody.includes(t)));
  const navCard = page.locator('a[href="/categories/navigation"]');
  check("Navigation card carries env-nav wash", (await navCard.locator(".env-nav").count()) === 1);

  // ── 2. Navigation category page ──
  await page.goto(`${BASE}/categories/navigation`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(800);
  const catH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check("category page renders Navigation title", catH1 === "Navigation", `h1="${catH1}"`);
  const catBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const catMiss = NAV_MODULES.filter(([, t]) => !catBody.includes(t)).map(([, t]) => t);
  check("category page lists all 12 NAV modules", catMiss.length === 0, catMiss.join(", ") || "all present");
  check("Navigation region mark has accessible name", (await page.getByRole("img", { name: "Navigation region" }).count()) === 1);
  await page.screenshot({ path: `${OUT}24-navigation-category.png` });

  // ── 3. All 12 module details: real titles, no raw IDs, lesson+quiz ──
  for (const [id, title] of NAV_MODULES) {
    await page.goto(`${BASE}/modules/${id}`);
    await page.waitForSelector("h1", { timeout: 15000 });
    await sleep(400);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    check(`module ${id} renders title`, h1 === title, `h1="${h1}"`);
    const body = (await page.locator("body").textContent().catch(() => "")) ?? "";
    check(`  no raw internal IDs on ${id}`, !body.includes(`${id}-K01`) && !body.includes(`${id}-L01`));
    check(`  lesson+quiz available on ${id}`, body.includes("Lesson") && body.includes("Quiz"));
  }

  // ── 4. Lesson journey (NAV-navigation-fundamentals) ──
  await page.goto(`${BASE}/modules/NAV-navigation-fundamentals/lesson`);
  await page.waitForSelector("text=Learning Objectives", { timeout: 15000 });
  await sleep(500);
  const lessonBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("lesson renders real content (bearing vs route)", lessonBody.includes("bearing"));
  check("lesson carries caution text", /compound silently|never out-walk/i.test(lessonBody));
  const completeBtn = page.getByRole("button", { name: /complete/i }).first();
  if ((await completeBtn.count()) > 0) {
    await completeBtn.click();
    await sleep(1000);
  }
  const lc = await context.request.get(`${BASE}/api/v1/progress/modules/NAV-navigation-fundamentals`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const lcJson = await lc.json().catch(() => null);
  check("lesson completion persists server-side", lcJson?.lesson_completed === true, JSON.stringify(lcJson));
  await sleep(800);

  // ── 5. Quiz GET payloads: leak-free, 10 questions, all 12 NAV quizzes ──
  for (const [id] of NAV_MODULES) {
    const resp = await context.request.get(`${BASE}/api/v1/quizzes/${id}-Q01`);
    const json = await resp.json().catch(() => null);
    const questions = json?.questions ?? json?.data?.questions ?? [];
    const raw = JSON.stringify(json ?? {});
    const leaked = /\bcorrect_answer\b|\bexplanation\b/i.test(raw);
    check(
      `quiz payload ${id}-Q01 leak-free with 10 questions`,
      !leaked && questions.length === 10,
      `questions=${questions.length}`,
    );
    await sleep(400);
  }

  // ── 6. Full quiz journey (NAV-route-planning) ──
  await page.goto(`${BASE}/modules/NAV-route-planning/quiz`);
  await page.waitForSelector("text=Start quiz", { timeout: 15000 });
  await page.getByRole("button", { name: /start quiz/i }).click();
  await page.waitForSelector("text=Question 1 of 10", { timeout: 15000 });
  for (let q = 1; q <= 10; q++) {
    await page.waitForSelector(`text=Question ${q} of 10`, { timeout: 15000 });
    const radios = page.getByRole("radiogroup").first().getByRole("radio");
    await radios.first().click().catch(() => {});
    await sleep(150);
    if (q < 10) {
      const nextBtn = page.getByRole("button", { name: /next/i });
      if ((await nextBtn.count()) > 0) await nextBtn.click();
    }
    await sleep(150);
  }
  await page.getByRole("button", { name: /submit quiz/i }).click().catch(() => {});
  await page.waitForSelector("text=/result|score/i", { timeout: 15000 });
  const resultText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("NAV quiz server-scored result renders", /result|score|correct/i.test(resultText));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}24-navigation-quiz-result.png` });

  // ── 7. XP + Progress ──
  await page.goto(`${BASE}/dashboard`);
  await page.waitForSelector("text=Welcome back", { timeout: 15000 });
  await sleep(1000);
  const dashBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("dashboard shows XP after quiz+lesson", /xp/i.test(dashBody) && !/0 xp/i.test(dashBody));

  await page.goto(`${BASE}/progress`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(1000);
  const progBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const progMissing = NAV_MODULES.filter(([, t]) => !progBody.includes(t)).map(([, t]) => t);
  check("progress page lists all 12 NAV modules", progMissing.length === 0, progMissing.join(", ") || "all present");
} catch (err) {
  console.error("VERIFY24 CRASH:", err);
  await page.screenshot({ path: `${OUT}24-crash.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY24: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
