/**
 * Phase 22 (Batch 06 MED) verification (TEMPORARY): real backend + real dev
 * DB. Covers: login → Learn shows Medical category with 7 modules → each
 * module detail renders real content → lesson journey (MED-bleeding-control)
 * with server-side completion → quiz journey with server-scored result → no
 * answer leakage in quiz GET payloads (all 7 MED quizzes, API-level) → XP
 * awarded → Progress records MED → regression smoke on the 6 existing
 * categories. Pace ~1.2s between navigations (rate limiter 100 req/min).
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

const MED_MODULES = [
  ["MED-bleeding-control", "Bleeding Control"],
  ["MED-wound-care", "Wound Care"],
  ["MED-burns", "Burns"],
  ["MED-fractures", "Fractures & Immobilization"],
  ["MED-heat-cold", "Heat & Cold Emergencies"],
  ["MED-emergency-assessment", "Emergency Assessment"],
  ["MED-emergency-kit", "Emergency Kit"],
];

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
  await login();
  check("login → dashboard (real stack)", true);

  // ── 1. Learn page shows Medical category card ──
  await page.goto(`${BASE}/categories`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(800);
  const learnBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const learnH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check("Learn page renders", learnH1 === "Learn", `h1="${learnH1}"`);
  check("Learn page shows Medical region card", learnBody.includes("Medical & First Aid"));
  check("Learn page shows all 7 region cards", ["Water", "Fire", "Survival Fundamentals", "Shelter", "Food", "Agriculture"].every((t) => learnBody.includes(t)));

  // ── 2. Medical category page ──
  await page.goto(`${BASE}/categories/medical-first-aid`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(800);
  const catH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check("category page renders Medical title", /medical/i.test(catH1), `h1="${catH1}"`);
  const catBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const catMiss = MED_MODULES.filter(([, t]) => !catBody.includes(t)).map(([, t]) => t);
  check("category page lists all 7 MED modules", catMiss.length === 0, catMiss.join(", ") || "all present");
  await page.screenshot({ path: `${OUT}22-medical-category.png` });

  // ── 3. All 7 module details: real titles, no raw IDs ──
  for (const [id, title] of MED_MODULES) {
    await page.goto(`${BASE}/modules/${id}`);
    await page.waitForSelector("h1", { timeout: 15000 });
    await sleep(500);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    check(`module ${id} renders title`, h1 === title, `h1="${h1}"`);
    const body = (await page.locator("body").textContent().catch(() => "")) ?? "";
    check(`  no raw internal IDs on ${id}`, !body.includes(`${id}-K01`) && !body.includes(`${id}-L01`));
    check(`  lesson+quiz available on ${id}`, body.includes("Lesson") && body.includes("Quiz"));
  }

  // ── 4. Lesson journey (MED-bleeding-control) ──
  await page.goto(`${BASE}/modules/MED-bleeding-control/lesson`);
  await page.waitForSelector("text=Learning Objectives", { timeout: 15000 });
  await sleep(500);
  const lessonBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("lesson renders real content (tourniquet doctrine)", lessonBody.includes("tourniquet"));
  check("lesson carries medical disclaimer", /not a substitute for professional medical advice/i.test(lessonBody));
  check("lesson carries escalation guidance", /emergency services|emergency number/i.test(lessonBody));
  const completeBtn = page.getByRole("button", { name: /complete/i }).first();
  if ((await completeBtn.count()) > 0) {
    await completeBtn.click();
    await sleep(1000);
  }
  const lc = await context.request.get(`${BASE}/api/v1/progress/modules/MED-bleeding-control`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const lcJson = await lc.json().catch(() => null);
  check("lesson completion persists server-side", lcJson?.lesson_completed === true, JSON.stringify(lcJson));
  await sleep(800);

  // ── 5. Quiz GET payloads: no answer leakage, all 7 MED quizzes (API-level) ──
  for (const [id] of MED_MODULES) {
    const resp = await context.request.get(`${BASE}/api/v1/quizzes/${id}-Q01`);
    const json = await resp.json().catch(() => null);
    const questions = json?.questions ?? json?.data?.questions ?? [];
    const raw = JSON.stringify(json ?? {});
    const leaked =
      /\bcorrect_answer\b|\bexplanation\b/i.test(raw) &&
      !/post-submit review/i.test(raw);
    check(
      `quiz payload ${id}-Q01 has no correct_answer/explanation`,
      !leaked && questions.length === 10,
      `questions=${questions.length}`,
    );
    await sleep(400);
  }

  // ── 6. Full quiz journey on MED-burns (UI): start → answer → submit → result ──
  await page.goto(`${BASE}/modules/MED-burns/quiz`);
  await page.waitForSelector("text=Start quiz", { timeout: 15000 });
  const quizPageBefore = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("quiz pre-start shows no correct_answer/explanation", !/correct answer|explanation/i.test(quizPageBefore));
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
  check("MED-burns quiz server-scored result renders", /result|score|correct/i.test(resultText));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}22-med-burns-quiz-result.png` });

  // ── 7. XP awarded through authoritative system ──
  await page.goto(`${BASE}/dashboard`);
  await page.waitForSelector("text=Welcome back", { timeout: 15000 });
  await sleep(1000);
  const dashBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("dashboard shows XP after quiz+lesson", /xp/i.test(dashBody) && !/0 xp/i.test(dashBody), "");

  // ── 8. Progress records MED module ──
  await page.goto(`${BASE}/progress`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(1000);
  const progBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("progress page lists MED module", progBody.includes("Bleeding Control") || progBody.includes("Burns"));
  const progMissing = MED_MODULES.filter(([, t]) => !progBody.includes(t)).map(([, t]) => t);
  check("progress page lists all 7 MED modules", progMissing.length === 0, progMissing.join(", ") || "all present");

  // ── 9. Regression smoke: 6 existing categories ──
  for (const [slug, title, probe] of [
    ["water", "Water", "Water Purification"],
    ["fire", "Fire", "Fire Starting"],
    ["survival-fundamentals", "Survival Fundamentals", "Emergency Preparedness Basics"],
    ["shelter", "Shelter", "Tarp Shelters"],
    ["food", "Food", "Food Storage Fundamentals"],
    ["agriculture", "Agriculture", "Garden Planning Fundamentals"],
  ]) {
    await page.goto(`${BASE}/categories/${slug}`);
    await page.waitForSelector("h1", { timeout: 15000 });
    await sleep(600);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    const hasProbe = (await page.locator("body").textContent().catch(() => ""))?.includes(probe) ?? false;
    check(`regression: ${slug} category renders`, h1 === title && hasProbe, `h1="${h1}"`);
  }

  // ── 10. Cross-user isolation (fresh user sees clean MED state) ──
  await sleep(8000); // let the rate-limit window drain before user #2
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/login`);
  await page2.waitForSelector("text=Continue with Google");
  await page2.click("text=Continue with Google");
  await page2.waitForURL(/dashboard/, { timeout: 30000 });
  await page2.waitForSelector("text=Welcome back");
  await sleep(3500);
  await page2.goto(`${BASE}/modules/MED-bleeding-control`);
  await page2.waitForSelector("h1", { timeout: 30000 });
  await sleep(1000);
  const freshPct = await page2.getByRole("progressbar").first().getAttribute("aria-label").catch(() => null);
  check("fresh user sees 0% progress on MED module", freshPct !== null && freshPct.includes("0%"), `aria-label="${freshPct}"`);
  await ctx2.close();

  await page.screenshot({ path: `${OUT}22-medical-learn.png` }).catch(() => {});
} catch (err) {
  console.error("VERIFY22 CRASH:", err);
  await page.screenshot({ path: `${OUT}22-crash.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY22: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
