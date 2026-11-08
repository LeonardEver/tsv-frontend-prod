import { beforeEach, describe, expect, it } from "vitest";
import { readExperienceMode, writeExperienceMode } from "./state";

describe("experience preference", () => {
  beforeEach(() => { window.localStorage.clear(); });
  it("defaults to PRO", () => { expect(readExperienceMode()).toBe("pro"); });
  it("persists Simplified on this device", () => {
    writeExperienceMode("simplified");
    expect(readExperienceMode()).toBe("simplified");
  });
});