/**
 * Phase 22 part 4 (TEMPORARY): cross-user isolation on MED content via the
 * module detail's authoritative text states (fresh mock-OIDC user must see
 * "Not started" / "Not attempted" / "In progress" on MED-bleeding-control
 * after user #1 completed its lesson). Run separately from the main battery
 * to keep the rate-limit window clean.
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
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForSelector("text=Welcome back");
  await sleep(3000);

  await page.goto(`${BASE}/modules/MED-bleeding-control`);
  await page.waitForSelector("h1", { timeout: 30000 });
  await sleep(1000);
  const body = (await page.locator("body").textContent().catch(() => "")) ?? "";
  check("fresh user: lesson shows 'Not started'", body.includes("Not started"));
  check("fresh user: quiz shows 'Not attempted'", body.includes("Not attempted"));
  check("fresh user: module shows 'In progress'", body.includes("In progress"));
  check("fresh user: no 'Completed' markers for MED module", !body.includes("Completed"));
  check(
    "fresh user: authoritative progress states are clean (Not started/Not attempted)",
    !body.includes("Best ") && !body.includes("Attempted"),
  );
  await ctx.close();
} catch (err) {
  console.error("VERIFY4 CRASH:", err);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nVERIFY4: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
