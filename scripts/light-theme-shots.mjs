/**
 * Light-theme screenshots for review (TEMPORARY dev helper).
 * Captures the same surfaces as visual-review.mjs but in LIGHT mode.
 */
/* eslint-disable no-undef -- addInitScript runs in the browser context */
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

// Start in light mode via the device preference.
await page.addInitScript(() => {
  window.localStorage.setItem("theme-pref", "light");
});

await page.goto(`${BASE}/login`);
await page.waitForSelector("text=Continue with Google");
await page.screenshot({ path: `${OUT}17-login-light.png` });

await page.click("text=Continue with Google");
await page.waitForURL(/dashboard/);
await page.waitForSelector("text=Welcome back");
await page.screenshot({ path: `${OUT}18-dashboard-light.png` });

await page.goto(`${BASE}/categories`);
await page.waitForSelector("text=Explore regions");
await page.screenshot({ path: `${OUT}19-categories-light.png` });

await page.goto(`${BASE}/gamification`);
await page.waitForSelector("text=Achievements");
await page.screenshot({ path: `${OUT}20-gamification-light.png` });

await browser.close();
console.log("Light screenshots written to", OUT);
