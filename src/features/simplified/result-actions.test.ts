import { describe, expect, it } from "vitest";
import { simplifiedResultActions } from "./result-actions";

describe("simplifiedResultActions", () => {
  it("continues the SAME mission while it is still incomplete", () => {
    // Also the unsuccessful-attempt case: nothing is reset, the learner
    // simply carries on with the mission they were already on.
    expect(simplifiedResultActions("SUR-kit", "SUR-kit")).toEqual({
      to: "/simplified/missions/SUR-kit",
      label: "Continue mission",
    });
  });

  it("offers the next mission once this one is done", () => {
    expect(simplifiedResultActions("SUR-kit", "WAT-boiling")).toEqual({
      to: "/simplified/missions/WAT-boiling",
      label: "Next mission",
    });
  });

  it("returns to the expedition path when the region is finished", () => {
    expect(simplifiedResultActions("SUR-kit", null)).toEqual({
      to: "/simplified",
      label: "Back to expedition",
    });
  });

  it("never points outside the Simplified experience", () => {
    for (const next of ["SUR-kit", "WAT-boiling", null]) {
      expect(simplifiedResultActions("SUR-kit", next).to.startsWith("/simplified")).toBe(true);
    }
  });
});
