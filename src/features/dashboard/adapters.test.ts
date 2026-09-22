/**
 * The Home recommendation rule, tested as a pure function.
 *
 * The behaviour that matters is ordering: the recommendation follows the
 * server's own module order and stops at the first module the backend has
 * not marked completed. Everything here is the server's data — the
 * selector adds no ordering of its own and infers no completion.
 */
import { describe, expect, it } from "vitest";
import { nextIncompleteModule, nextMissionAction } from "./adapters";
import type { ModuleListResponse } from "@/lib/api/types";

type ModuleRow = ModuleListResponse["modules"][number];

function row(module_id: string, completed: boolean, progress_pct = 0): ModuleRow {
  return {
    module_id,
    title: module_id,
    category: "water",
    difficulty: "beginner",
    estimated_duration: 20,
    description: null,
    completed,
    progress_pct,
  };
}

describe("nextIncompleteModule", () => {
  it("recommends the first incomplete mission when nothing is done", () => {
    const rows = [row("m1", false), row("m2", false), row("m3", false)];
    expect(nextIncompleteModule(rows)?.module_id).toBe("m1");
  });

  it("skips completed missions wherever they sit in the order", () => {
    const rows = [row("m1", true, 100), row("m2", true, 100), row("m3", false), row("m4", false)];
    expect(nextIncompleteModule(rows)?.module_id).toBe("m3");
  });

  it("advances to the next mission once the current one is completed", () => {
    // The same curriculum, before and after m1 flips to completed.
    const before = [row("m1", false), row("m2", false), row("m3", false)];
    expect(nextIncompleteModule(before)?.module_id).toBe("m1");
    const after = [row("m1", true, 100), row("m2", false), row("m3", false)];
    expect(nextIncompleteModule(after)?.module_id).toBe("m2");
    const afterTwo = [row("m1", true, 100), row("m2", true, 100), row("m3", false)];
    expect(nextIncompleteModule(afterTwo)?.module_id).toBe("m3");
  });

  it("treats partial progress as incomplete", () => {
    // progress_pct is a display value; only `completed` decides.
    const rows = [row("m1", false, 73), row("m2", false)];
    expect(nextIncompleteModule(rows)?.module_id).toBe("m1");
  });

  it("preserves the server's order rather than sorting", () => {
    // Deliberately non-alphabetical, non-numeric ids: whatever the server
    // sends is the curriculum.
    const rows = [row("zebra", false), row("alpha", false)];
    expect(nextIncompleteModule(rows)?.module_id).toBe("zebra");
  });

  it("returns null when the curriculum is complete or empty", () => {
    expect(nextIncompleteModule([row("m1", true, 100)])).toBeNull();
    expect(nextIncompleteModule([])).toBeNull();
    expect(nextIncompleteModule(undefined)).toBeNull();
  });
});

describe("nextMissionAction", () => {
  it("targets the lesson while it is not completed", () => {
    expect(nextMissionAction(false, false, "m1")).toEqual({
      to: "/modules/m1/lesson",
      ctaLabel: "Take lesson",
    });
  });

  it("targets the quiz once the lesson is completed", () => {
    expect(nextMissionAction(true, false, "m1")).toEqual({
      to: "/modules/m1/quiz",
      ctaLabel: "Take quiz",
    });
    expect(nextMissionAction(true, true, "m1")).toEqual({
      to: "/modules/m1/quiz",
      ctaLabel: "Retake quiz",
    });
  });

  it("uses the canonical lesson route, never the module page", () => {
    // The whole point of the change: Home → Lesson.
    const { to } = nextMissionAction(false, false, "WAT-boiling");
    expect(to).toBe("/modules/WAT-boiling/lesson");
    expect(to).not.toBe("/modules/WAT-boiling");
  });
});
