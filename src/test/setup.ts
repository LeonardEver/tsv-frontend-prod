/**
 * Vitest setup: jest-dom matchers, MSW node server lifecycle, and RTL
 * cleanup. (RTL auto-cleanup only registers when `globals: true`; we run
 * with explicit imports, so cleanup is wired here.)
 *
 * AbortController/AbortSignal realm pinning happens in the custom
 * environment (jsdom-node-abort-environment.ts) — see there for why.
 */
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";
import { __resetBilling, __setTestPlan } from "./msw/handlers";

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }); });
afterEach(() => {
  server.resetHandlers();
  __resetBilling();
  __setTestPlan("survivor"); // pre-existing learning-surface default
  cleanup();
});
afterAll(() => { server.close(); });
