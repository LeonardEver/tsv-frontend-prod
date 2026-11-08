/** Local visual review using API fixtures; run with the Vite server available. */
/* global document, innerWidth */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const reviewLearn = process.argv.includes("--learn");
const reviewProgress = process.argv.includes("--progress");
const reviewRewards = process.argv.includes("--rewards");
const singleResult = reviewProgress && process.argv.includes("--single-result");
const output = reviewRewards ? "visual-review/rewards-atmosphere" : reviewProgress ? `visual-review/progress-atmosphere${singleResult ? "-single" : ""}` : reviewLearn ? "visual-review/learn-atmosphere" : "visual-review/home-atmosphere";
await mkdir(output, { recursive: true });
const modules = [
  ["SUR-emergency-planning", "Household Emergency Planning"],
  ["SUR-preparedness", "Emergency Preparedness Basics"],
  ["SUR-prioritization", "Prioritization"],
  ["SUR-risk-assessment", "Risk Assessment"],
  ["SUR-situational-awareness", "Situational Awareness"],
  ["SUR-survival-psychology", "Survival Psychology"],
].map(([module_id, title], index) => ({ module_id, title, category: "survival-fundamentals", difficulty: "beginner", estimated_duration: 25, description: "Evaluating hazards before they happen: likelihood, severity, and exposure; risk matrices for the household; mitigation versus acceptance; and reassessment as conditions change.", completed: index < (singleResult ? 1 : 3), progress_pct: index < (singleResult ? 1 : 3) ? 100 : 0 }));

const categories = [
  ["SUR", "survival-fundamentals", "Survival Fundamentals", 6, 3],
  ["WAT", "water", "Water", 11, 0],
  ["FIR", "fire", "Fire", 7, 0],
  ["SHE", "shelter", "Shelter", 8, 0],
  ["FOD", "food", "Food", 10, 0],
  ["AGR", "agriculture", "Agriculture", 9, 0],
  ["FOR", "foraging-plants", "Foraging & Plants", 10, 0],
  ["MED", "medical-first-aid", "Medical & First Aid", 7, 0],
  ["NAV", "navigation", "Navigation", 12, 0],
].map(([code, slug, title, module_count, completed_count]) => ({ code, slug, title, module_count, completed_count: singleResult && code === "SUR" ? 1 : completed_count }));

const progressActivity = [
  [1, "lesson_started", null],
  [2, "quiz_completed", 100],
  [2, "quiz_started", null],
  [0, "lesson_completed", null],
  [0, "lesson_started", null],
  [1, "quiz_completed", 67],
].map(([index, action, score], i) => ({ module_id: modules[index].module_id, action, score, at: new Date(Date.now() - (i + 1) * 3_600_000).toISOString() }));

const rewardsAchievements = {
  earned: [{ achievement_key: "first_quiz_passed", title: "✅ First Quiz Passed", description: "Pass your first quiz", icon: "✅", earned_at: "2026-11-08T12:00:00Z" }],
  unearned: [
    { achievement_key: "first_water_module", title: "💧 First Water Module", description: "Complete your first Water category module", icon: "💧" },
    { achievement_key: "fire_starter", title: "🔥 Fire Starter", description: "Complete your first Fire category module", icon: "🔥" },
    { achievement_key: "water_master", title: "🌊 Water Master", description: "Complete all 7 Water modules", icon: "🌊" },
    { achievement_key: "week_warrior", title: "📅 Week Warrior", description: "Maintain a 7-day learning streak", icon: "📅", progress: { completed: 1, total: 7, pct: 14 } },
    { achievement_key: "quiz_master", title: "🧠 Quiz Master", description: "Pass 10 quizzes", icon: "🧠", progress: { completed: 1, total: 10, pct: 10 } },
    { achievement_key: "lesson_scholar", title: "📖 Lesson Scholar", description: "Complete 5 lessons", icon: "📖", progress: { completed: 1, total: 5, pct: 20 } },
  ],
};

const browser = await chromium.launch({ headless: true });
try {
  for (const view of [
    ...(reviewProgress || reviewRewards ? [{ name: "reference", width: 1600, height: 900, theme: "dark" }] : []),
    { name: "desktop", width: 1440, height: 1000, theme: "dark" },
    { name: "desktop-wide", width: 1848, height: 1000, theme: "dark" },
    { name: "desktop-light", width: 1440, height: 1000, theme: "light" },
    { name: "tablet", width: 820, height: 1180, theme: "dark" },
    { name: "mobile", width: 390, height: 844, theme: "dark" },
    { name: "mobile-small", width: 320, height: 844, theme: "dark" },
  ]) {
    const page = await browser.newPage({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((theme) => localStorage.setItem("theme-pref", theme), view.theme);
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/v1/auth/me") return json({ user_id: 1, display_name: "Leonardo Araujo", email: "learner@example.com", created_at: "2026-08-01T12:00:00Z" });
      if (path === "/api/v1/categories") return json({ categories });
      if (path === "/api/v1/modules") return json({ modules, pagination: { next_cursor: null, has_more: false, page_size: 6 } });
      if (path === "/api/v1/progress") return json({ modules_completed: singleResult ? 1 : 3, total_modules: 80, total_xp: singleResult ? 125 : 225, level: 1, current_streak: singleResult ? 1 : 2, longest_streak: singleResult ? 1 : 2, recent_activity: reviewProgress ? progressActivity : [modules[2], modules[1], modules[0]].map((mod) => ({ module_id: mod.module_id, action: "quiz_completed", score: 100, at: "2026-11-07T12:00:00Z" })) });
      if (path === "/api/v1/gamification") return json({ total_xp: singleResult ? 125 : 225, level: 1, level_title: "Novice", xp_to_next_level: singleResult ? 175 : 75, current_streak: singleResult || reviewRewards ? 1 : 2, longest_streak: singleResult || reviewRewards ? 1 : 2, achievements_earned: reviewRewards ? 1 : 0, recent_transactions: reviewRewards ? [{ amount: 75, source: "quiz_passed", at: "2026-11-08T12:00:00Z" }, { amount: 50, source: "lesson_completed", at: "2026-11-07T12:00:00Z" }] : [] });
      if (path === "/api/v1/gamification/achievements") return json(reviewRewards ? rewardsAchievements : { earned: [], unearned: [] });
      if (path === "/api/v1/usage") return json({ plan_name: "Free", lesson_completions: 1, quiz_attempts: 0, limits: { daily_lessons: 1, daily_quizzes: 1 } });
      if (path === "/api/v1/subscription") return json({ plan_code: "free", plan_name: "Free", entitlements: { community: false, daily_lessons: 1, daily_quizzes: 1, quiz_before_lesson: false, resource_download: false } });
      const progressModule = modules.find((row) => path === `/api/v1/progress/modules/${row.module_id}`);
      if (progressModule) {
        const index = modules.indexOf(progressModule);
        const tested = index < (singleResult ? 1 : 5);
        return json({ module_id: progressModule.module_id, lesson_completed: progressModule.completed, lesson_completed_at: progressModule.completed ? "2026-11-07T12:00:00Z" : null, quiz_attempts: tested ? 1 : 0, quiz_best_score: tested ? singleResult ? 89 : [100, 100, 100, 67, 100][index] : null, quiz_last_passed: tested ? index !== 3 : null, lo_performance: [] });
      }
      const mod = modules.find((row) => path === `/api/v1/modules/${row.module_id}`);
      if (mod) return json({ ...mod, content_version: 1, subcategory: "risk-assessment", knowledge_items: [], lesson: { lesson_id: `${mod.module_id}-L01`, title: mod.title, estimated_minutes: 25, completed: mod.completed }, quiz: { quiz_id: `${mod.module_id}-Q01`, title: `${mod.title} Quiz`, question_count: 10, best_score: null, attempt_count: 0 }, resources: [], progress: { lesson_completed: mod.completed, quiz_best_score: null, completed: mod.completed } });
      return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Not available", request_id: "home-review" } }) });
    });
    await page.goto(`http://localhost:5173${reviewRewards ? "/gamification" : reviewProgress ? "/progress" : reviewLearn ? "/categories" : "/dashboard"}`);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    if (reviewRewards) {
      await page.evaluate(() => document.documentElement.scrollTo({ top: document.documentElement.scrollHeight }));
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.documentElement.scrollTo({ top: 0 }));
    }
    await page.screenshot({ path: `${output}/${view.name}.png`, animations: "disabled", fullPage: reviewRewards || reviewProgress && view.width >= 1280 });
    if (reviewProgress && view.name === "reference") {
      await page.getByRole("region", { name: "Expedition overview" }).screenshot({ path: `${output}/top.png`, animations: "disabled" });
    }
    if (reviewProgress && view.name === "mobile") {
      await page.getByRole("region", { name: "Lesson Performance" }).screenshot({ path: `${output}/mobile-lessons.png`, animations: "disabled" });
    }
    const metrics = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth - innerWidth, panels: Array.from(document.querySelectorAll('section[aria-labelledby]')).map((node) => ({ name: node.getAttribute("aria-labelledby"), width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height) })), lessonWidths: Array.from(document.querySelectorAll('article[aria-label^="Lesson "]')).map((node) => Math.round(node.getBoundingClientRect().width)), images: Array.from(document.querySelectorAll("main img")).filter((node) => node.getBoundingClientRect().width > 0).map((node) => ({ source: node.getAttribute("src"), loaded: node.complete && node.naturalWidth > 0 })), heading: Array.from(document.querySelectorAll("main h1")).find((node) => node.getBoundingClientRect().width > 0)?.textContent }));
    console.log(JSON.stringify({ view: view.name, errors, ...metrics }));
    await page.close();
  }
} finally {
  await browser.close();
}
