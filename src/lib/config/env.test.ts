import { afterEach, describe, expect, it, vi } from "vitest";
import { env, isBillingEnabled } from "./env";
import { isLoopbackHttpUrl } from "./local-development";

const originalKey = env.stripePublishableKey;
afterEach(() => { vi.unstubAllEnvs(); Object.assign(env, { stripePublishableKey: originalKey }); });
describe("local billing isolation", () => {
  it("accepts only actual loopback API origins", () => {
    expect(isLoopbackHttpUrl("http://localhost:3000")).toBe(true);
    expect(isLoopbackHttpUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopbackHttpUrl("https://survivalacademy.online")).toBe(false);
    expect(isLoopbackHttpUrl("http://localhost.evil.example")).toBe(false);
    expect(isLoopbackHttpUrl("http://localhost@evil.example")).toBe(false);
    expect(isLoopbackHttpUrl("not a URL")).toBe(false);
  });
  it("disables checkout on the development server even if a publishable key exists", () => {
    vi.stubEnv("DEV", true); vi.stubEnv("MODE", "development");
    Object.assign(env, { stripePublishableKey: "pk_test_fixture" });
    expect(isBillingEnabled()).toBe(false);
  });
  it("keeps production checkout dependent on its configured key", () => {
    vi.stubEnv("DEV", false); vi.stubEnv("MODE", "production");
    Object.assign(env, { stripePublishableKey: "pk_test_fixture" });
    expect(isBillingEnabled()).toBe(true);
    Object.assign(env, { stripePublishableKey: undefined });
    expect(isBillingEnabled()).toBe(false);
  });
});
