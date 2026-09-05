/**
 * Phase 21 verification part 3 (TEMPORARY): cross-user isolation via the
 * module detail's authoritative text states (fresh mock-OIDC user must see
 * "Not started" / "Not attempted" / "In progress" on a module that user #1
 * completed).
 */
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
  await page.waitForURL(/dashboard/);
  await page.waitForSelector("text=Welcome back");
  await sleep(1000);

  await page.goto(`${BASE}/modules/AGR-garden-planning`);
  await page.waitForSelector("text=Your progress");
  const body = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("fresh user: lesson shows 'Not started'", body.includes("Not started"));
  check("fresh user: quiz shows 'Not attempted'", body.includes("Not attempted"));
  check("fresh user: module shows 'In progress'", body.includes("In progress"));
  check("fresh user: no 'Completed' markers for AGR module", !body.includes("Completed"));
  await ctx.close();
} catch (err) {
  console.error("VERIFY3 CRASH:", err);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY3: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
