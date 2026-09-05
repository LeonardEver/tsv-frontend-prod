/**
 * UI store theme preference (O-4): dark by default, validated
 * persistence, no cross-user implications (device-scoped pref).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ui-store theme", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("defaults to dark with empty storage", async () => {
    const { useUiStore } = await import("./ui-store");
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("restores a stored light preference", async () => {
    localStorage.setItem("theme-pref", "light");
    const { useUiStore } = await import("./ui-store");
    expect(useUiStore.getState().theme).toBe("light");
  });

  it("ignores invalid stored values", async () => {
    localStorage.setItem("theme-pref", "neon");
    const { useUiStore } = await import("./ui-store");
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("toggles and persists the preference", async () => {
    const { useUiStore } = await import("./ui-store");
    expect(useUiStore.getState().theme).toBe("dark");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("light");
    expect(localStorage.getItem("theme-pref")).toBe("light");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("theme-pref")).toBe("dark");
  });
});
