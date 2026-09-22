/**
 * Analytics date-range presets.
 *
 * The two single-day presets are CALENDAR days, not rolling 24-hour
 * windows: the surface dates everything as `YYYY-MM-DD` (UTC) and the
 * series endpoints bucket on UTC boundaries, so "Today" has to be the
 * same day the backend would call today. These tests pin that, including
 * across a month and a year boundary, and pin that the older presets kept
 * their exact windows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESET_WINDOWS, inclusiveDays, presetWindow, SERIES_MAX_DAYS } from "./filters";

/** Freeze the clock at a UTC instant so `toISOString()` is deterministic. */
function freeze(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

/** The window a preset id writes, or a failure that names the id. */
function windowFor(id: string) {
  const entry = PRESET_WINDOWS.find((preset) => preset.id === id);
  if (!entry) throw new Error(`no preset ${id}`);
  return presetWindow(entry);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("analytics range presets", () => {
  beforeEach(() => {
    // Mid-month, mid-day UTC — no boundary involved.
    freeze("2026-09-22T13:45:00.000Z");
  });

  it("offers Today and Yesterday beside the existing ranges", () => {
    expect(PRESET_WINDOWS.map((preset) => preset.id)).toEqual([
      "today",
      "yesterday",
      "7d",
      "30d",
      "90d",
      "365d",
    ]);
  });

  it("makes Today the current calendar day, not a rolling 24 hours", () => {
    const today = windowFor("today");
    expect(today).toEqual({ from: "2026-09-22", to: "2026-09-22" });
    // A single inclusive day — a rolling window could not be expressed as
    // one date pair, which is the whole reason this API uses calendar days.
    expect(inclusiveDays(today.from, today.to)).toBe(1);
  });

  it("makes Yesterday the previous calendar day", () => {
    expect(windowFor("yesterday")).toEqual({ from: "2026-09-21", to: "2026-09-21" });
  });

  it("steps back exactly one day, not one 24-hour period", () => {
    // Move the clock forward by one hour only: a rolling window would shift,
    // a calendar-day window cannot.
    freeze("2026-09-22T01:05:00.000Z");
    expect(windowFor("today")).toEqual({ from: "2026-09-22", to: "2026-09-22" });
    freeze("2026-09-22T23:55:00.000Z");
    expect(windowFor("today")).toEqual({ from: "2026-09-22", to: "2026-09-22" });
  });

  it("crosses a month boundary", () => {
    freeze("2026-10-01T09:00:00.000Z");
    expect(windowFor("today")).toEqual({ from: "2026-10-01", to: "2026-10-01" });
    expect(windowFor("yesterday")).toEqual({ from: "2026-09-30", to: "2026-09-30" });
  });

  it("crosses a year boundary", () => {
    freeze("2027-01-01T09:00:00.000Z");
    expect(windowFor("yesterday")).toEqual({ from: "2026-12-31", to: "2026-12-31" });
  });

  it("leaves the existing presets on their inclusive windows ending today", () => {
    expect(windowFor("7d")).toEqual({ from: "2026-09-16", to: "2026-09-22" });
    expect(windowFor("30d")).toEqual({ from: "2026-08-24", to: "2026-09-22" });
    expect(windowFor("90d")).toEqual({ from: "2026-06-25", to: "2026-09-22" });
    expect(windowFor("365d")).toEqual({ from: "2025-09-23", to: "2026-09-22" });
    expect(inclusiveDays("2026-08-24", "2026-09-22")).toBe(30);
  });

  it("keeps every preset inside the series endpoints' 366-day ceiling", () => {
    for (const preset of PRESET_WINDOWS) {
      const window = presetWindow(preset);
      const days = inclusiveDays(window.from, window.to);
      expect(days, preset.id).not.toBeNull();
      expect(days ?? 0).toBeGreaterThan(0);
      expect(days ?? 0).toBeLessThanOrEqual(SERIES_MAX_DAYS);
    }
  });
});
