/** Phase 24 part 2 (TEMPORARY): regression smoke on all 8 pre-NAV
 *  categories, standalone (rate-limiter window). */
import { chromium } from "@playwright/test";
const BASE = "http://localhost:5173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("text=Continue with Google");
  await page.click("text=Continue with Google");
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForSelector("text=Welcome back");
  await sleep(3000);
  for (const [slug, title, probe] of [
    ["water", "Water", "Water Purification"],
    ["fire", "Fire", "Fire Starting"],
    ["survival-fundamentals", "Survival Fundamentals", "Emergency Preparedness Basics"],
    ["shelter", "Shelter", "Tarp Shelters"],
    ["food", "Food", "Food Storage Fundamentals"],
    ["agriculture", "Agriculture", "Garden Planning Fundamentals"],
    ["medical-first-aid", "Medical & First Aid", "Bleeding Control"],
    ["foraging-plants", "Foraging & Plants", "Plant Identification Fundamentals"],
  ]) {
    await page.goto(`${BASE}/categories/${slug}`);
    await page.waitForSelector("h1", { timeout: 30000 });
    await sleep(700);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
    const hasProbe = (await page.locator("body").textContent().catch(() => ""))?.includes(probe) ?? false;
    check(`regression: ${slug} category renders`, h1 === title && hasProbe, `h1="${h1}"`);
  }
  await ctx.close();
} catch (err) {
  console.error("VERIFY24B CRASH:", err);
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY24B: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
