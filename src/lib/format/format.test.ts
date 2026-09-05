/**
 * Money formatting (billing currency normalization).
 *
 * The catalog is USD-only: $0 / $9.90 / $19.90. Formatting derives
 * from the server's price + ISO currency code; unknown codes fall
 * back to USD instead of crashing the plans surface.
 */
import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney (USD billing catalog)", () => {
  it("formats the canonical tier prices", () => {
    expect(formatMoney(0, "usd")).toBe("$0");
    expect(formatMoney(9.9, "usd")).toBe("$9.90");
    expect(formatMoney(19.9, "usd")).toBe("$19.90");
  });

  it("normalizes the ISO lowercase currency code from the API", () => {
    expect(formatMoney(9.9, "USD")).toBe("$9.90");
    expect(formatMoney(12, "usd")).toBe("$12.00");
  });

  it("never crashes on unknown currency codes", () => {
    // Runtimes differ (some ICU builds reject unknown codes, some
    // render them literally) — the contract is only: no crash.
    expect(() => formatMoney(12, "xyz")).not.toThrow();
  });
});
