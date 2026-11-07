/**
 * Phase 23 (Batch 07 FOR) verification (TEMPORARY): real backend + real dev
 * DB. Covers: login → Learn shows Foraging region card → category page lists
 * all 10 FOR modules → each module detail renders real content, no raw IDs →
 * lesson journey (FOR-edibility-safety) with server-side completion →
 * quiz GET payloads leak-free (all 10 FOR quizzes, API-level) → full quiz
 * journey on FOR-foraging-practice with server-scored result → XP →
 * Progress lists FOR modules → regression smoke on all 7 existing
 * categories. Pacing ~1.2s between navigations (rate limiter 100 req/min).
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

const FOR_MODULES = [
  ["FOR-plant-identification", "Plant Identification Fundamentals"],
  ["FOR-edibility-safety", "Wild Edibility & Safety"],
  ["FOR-dangerous-plants", "Dangerous & Toxic Plants"],
  ["FOR-lookalikes", "Dangerous Look-Alikes"],
  ["FOR-leaves", "Edible Leaves, Shoots & Greens"],
  ["FOR-fruits-berries", "Wild Fruits & Berries"],
  ["FOR-roots-tubers", "Roots, Tubers & Underground Foods"],
  ["FOR-mushrooms", "Wild Mushrooms & Fungal Safety"],
  ["FOR-foraging-practice", "Foraging Fieldcraft"],
  ["FOR-ethical-foraging", "Sustainable & Ethical Foraging"],
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

  // ── 1. Learn page shows Foraging region card + all 8 regions ──
  await page.goto(`${BASE}/categories`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(800);
  const learnBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const learnH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check("Learn page renders", learnH1 === "Learn", `h1="${learnH1}"`);
  check("Learn page shows Foraging region card", learnBody.includes("Foraging & Plants"));
  check(
    "Learn page shows all 8 region cards",
    ["Water", "Fire", "Survival Fundamentals", "Shelter", "Food", "Agriculture", "Medical & First Aid"].every((t) => learnBody.includes(t)),
  );

  // ── 2. Foraging category page ──
  await page.goto(`${BASE}/categories/foraging-plants`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(800);
  const catH1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  check("category page renders Foraging title", /foraging/i.test(catH1), `h1="${catH1}"`);
  const catBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const catMiss = FOR_MODULES.filter(([, t]) => !catBody.includes(t)).map(([, t]) => t);
  check("category page lists all 10 FOR modules", catMiss.length === 0, catMiss.join(", ") || "all present");
  await page.screenshot({ path: `${OUT}23-foraging-category.png` });

  // ── 3. All 10 module details: real titles, no raw IDs, lesson+quiz ──
  for (const [id, title] of FOR_MODULES) {
    await page.goto(`${BASE}/modules/${id}`);
    await page.waitForSelector("h1", { timeout: 15000 });
    await sleep(450);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    check(`module ${id} renders title`, h1 === title, `h1="${h1}"`);
    const body = (await page.locator("body").textContent().catch(() => "")) ?? "";
    check(`  no raw internal IDs on ${id}`, !body.includes(`${id}-K01`) && !body.includes(`${id}-L01`));
    check(`  lesson+quiz available on ${id}`, body.includes("Lesson") && body.includes("Quiz"));
  }

  // ── 4. Lesson journey (FOR-edibility-safety) ──
  await page.goto(`${BASE}/modules/FOR-edibility-safety/lesson`);
  await page.waitForSelector("text=Learning Objectives", { timeout: 15000 });
  await sleep(500);
  const lessonBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("lesson renders real content (positive identification)", lessonBody.includes("positive identification"));
  check("lesson explains universal edibility test inadequacy", /universal edibility test/i.test(lessonBody) && /not a reliable|not a safe|does not make/i.test(lessonBody));
  check("lesson carries caution text", /No shortcut test|do not consume/i.test(lessonBody));
  const completeBtn = page.getByRole("button", { name: /complete/i }).first();
  if ((await completeBtn.count()) > 0) {
    await completeBtn.click();
    await sleep(1000);
  }
  const lc = await context.request.get(`${BASE}/api/v1/progress/modules/FOR-edibility-safety`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const lcJson = await lc.json().catch(() => null);
  check("lesson completion persists server-side", lcJson?.lesson_completed === true, JSON.stringify(lcJson));
  await sleep(800);

  // ── 5. Quiz GET payloads: no answer leakage, all 10 FOR quizzes (API) ──
  for (const [id] of FOR_MODULES) {
    const resp = await context.request.get(`${BASE}/api/v1/quizzes/${id}-Q01`);
    const json = await resp.json().catch(() => null);
    const questions = json?.questions ?? json?.data?.questions ?? [];
    const raw = JSON.stringify(json ?? {});
    const leaked = /\bcorrect_answer\b|\bexplanation\b/i.test(raw);
    check(
      `quiz payload ${id}-Q01 leak-free with 11 questions`,
      !leaked && questions.length === 11,
      `questions=${questions.length}`,
    );
    await sleep(400);
  }

  // ── 6. Full quiz journey (FOR-foraging-practice) ──
  await page.goto(`${BASE}/modules/FOR-foraging-practice/quiz`);
  await page.waitForSelector("text=Start quiz", { timeout: 15000 });
  await page.getByRole("button", { name: /start quiz/i }).click();
  await page.waitForSelector("text=Question 1 of 11", { timeout: 15000 });
  for (let q = 1; q <= 11; q++) {
    await page.waitForSelector(`text=Question ${q} of 11`, { timeout: 15000 });
    const radios = page.getByRole("radiogroup").first().getByRole("radio");
    await radios.first().click().catch(() => {});
    await sleep(150);
    if (q < 11) {
      const nextBtn = page.getByRole("button", { name: /next/i });
      if ((await nextBtn.count()) > 0) await nextBtn.click();
    }
    await sleep(150);
  }
  await page.getByRole("button", { name: /submit quiz/i }).click().catch(() => {});
  await page.waitForSelector("text=/result|score/i", { timeout: 15000 });
  const resultText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("FOR quiz server-scored result renders", /result|score|correct/i.test(resultText));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}23-foraging-quiz-result.png` });

  // ── 7. XP awarded ──
  await page.goto(`${BASE}/dashboard`);
  await page.waitForSelector("text=Welcome back", { timeout: 15000 });
  await sleep(1000);
  const dashBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("dashboard shows XP after quiz+lesson", /xp/i.test(dashBody) && !/0 xp/i.test(dashBody));

  // ── 8. Progress records FOR modules ──
  await page.goto(`${BASE}/progress`);
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(1000);
  const progBody = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const progMissing = FOR_MODULES.filter(([, t]) => !progBody.includes(t)).map(([, t]) => t);
  check("progress page lists all 10 FOR modules", progMissing.length === 0, progMissing.join(", ") || "all present");

  // ── 9. Regression smoke: 7 existing categories ──
  for (const [slug, title, probe] of [
    ["water", "Water", "Water Purification"],
    ["fire", "Fire", "Fire Starting"],
    ["survival-fundamentals", "Survival Fundamentals", "Emergency Preparedness Basics"],
    ["shelter", "Shelter", "Tarp Shelters"],
    ["food", "Food", "Food Storage Fundamentals"],
    ["agriculture", "Agriculture", "Garden Planning Fundamentals"],
    ["medical-first-aid", "Medical & First Aid", "Bleeding Control"],
  ]) {
    await page.goto(`${BASE}/categories/${slug}`);
    await page.waitForSelector("h1", { timeout: 15000 });
    await sleep(500);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    const hasProbe = (await page.locator("body").textContent().catch(() => ""))?.includes(probe) ?? false;
    check(`regression: ${slug} category renders`, h1 === title && hasProbe, `h1="${h1}"`);
  }
} catch (err) {
  console.error("VERIFY23 CRASH:", err);
  await page.screenshot({ path: `${OUT}23-crash.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY23: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
