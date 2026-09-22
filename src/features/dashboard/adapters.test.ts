/**
 * The Home recommendation rule, tested as a pure function.
 *
 * Two things matter and are tested separately:
 *
 * 1. ORDERING — `/modules` is alphabetical by `module_id`, so the teaching
 *    sequence has to be applied before anything is chosen. The regression
 *    that motivated this is `AGR-composting` sorting ahead of `SUR-*` and
 *    being recommended to a learner who had finished nothing.
 * 2. COMPLETION — only the backend's `completed` flag advances the queue,
 *    and partial progress does not.
 */
import { describe, expect, it } from "vitest";
import { nextIncompleteModule, nextMissionAction } from "./adapters";
import type { ModuleListResponse } from "@/lib/api/types";

type ModuleRow = ModuleListResponse["modules"][number];

/** Slug is what `/modules` carries; the code map is what `/categories`
 * supplies. These cover both the curriculum regions and one that is not
 * part of it. */
const CODE_BY_SLUG: Record<string, string> = {
  fundamentals: "SUR",
  water: "WAT",
  fire: "FIR",
  shelter: "SHE",
  food: "FOD",
  agriculture: "AGR",
  foraging: "FOR",
  medical: "MED",
  navigation: "NAV",
  energy: "ENE",
};

const codeForSlug = (slug: string): string | undefined => CODE_BY_SLUG[slug];

function row(
  module_id: string,
  category: string,
  completed: boolean,
  progress_pct = 0,
): ModuleRow {
  return {
    module_id,
    title: module_id,
    category,
    difficulty: "beginner",
    estimated_duration: 20,
    description: null,
    completed,
    progress_pct,
  };
}

describe("nextIncompleteModule — curriculum order", () => {
  it("recommends Survival Fundamentals to a learner who has completed nothing", () => {
    // Exactly the shape /modules returns: alphabetical by module_id, so
    // Agriculture sorts first and Survival Fundamentals sorts near the end.
    const rows = [
      row("AGR-composting", "agriculture", false),
      row("FIR-fire-laying", "fire", false),
      row("SUR-prioritization", "fundamentals", false),
      row("WAT-finding-water", "water", false),
    ];

    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("SUR-prioritization");
  });

  it("never recommends Composting while an earlier region is unfinished", () => {
    // The reported bug, pinned. Composting is first in the response and
    // must still be last in line.
    const rows = [
      row("AGR-composting", "agriculture", false),
      row("SUR-prioritization", "fundamentals", false),
    ];

    const next = nextIncompleteModule(rows, codeForSlug);
    expect(next?.module_id).not.toBe("AGR-composting");
    expect(next?.module_id).toBe("SUR-prioritization");
  });

  it("follows the full canonical sequence exactly", () => {
    const canonical: Array<[string, string]> = [
      ["SUR-a", "fundamentals"],
      ["WAT-a", "water"],
      ["FIR-a", "fire"],
      ["SHE-a", "shelter"],
      ["FOD-a", "food"],
      ["AGR-a", "agriculture"],
      ["FOR-a", "foraging"],
      ["MED-a", "medical"],
      ["NAV-a", "navigation"],
    ];
    // Fed in reverse, and with the completed flag following the sequence:
    // each step must recommend the next region, one at a time.
    const rows = [...canonical].reverse().map(([id, slug]) => row(id, slug, false));

    for (let done = 0; done < canonical.length; done += 1) {
      const state = rows.map((r) => {
        const index = canonical.findIndex(([id]) => id === r.module_id);
        return { ...r, completed: index < done };
      });
      expect(nextIncompleteModule(state, codeForSlug)?.module_id).toBe(canonical[done]?.[0]);
    }
  });

  it("stays inside the current region until every one of its modules is done", () => {
    // Fundamentals has two modules; finishing the first must not move the
    // learner to Water.
    const rows = [
      row("WAT-a", "water", false),
      row("SUR-b", "fundamentals", false),
      row("SUR-a", "fundamentals", true, 100),
    ];

    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("SUR-b");
  });

  it("advances exactly one region once the current one is finished", () => {
    const rows = [
      row("FIR-a", "fire", false),
      row("WAT-a", "water", false),
      row("SUR-a", "fundamentals", true, 100),
    ];

    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("WAT-a");
  });

  it("orders modules inside one region by module_id, matching every browse surface", () => {
    const rows = [
      row("SUR-zoning", "fundamentals", false),
      row("SUR-prioritization", "fundamentals", false),
    ];

    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("SUR-prioritization");
  });

  it("sorts regions outside the curriculum after every region inside it", () => {
    // A newly published region must not jump the queue.
    const rows = [
      row("ENE-solar", "energy", false),
      row("NAV-a", "navigation", false),
    ];

    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("NAV-a");
  });

  it("resolves slugs the map does not know without crashing or reordering known ones", () => {
    const rows = [
      row("ZZZ-mystery", "unmapped-region", false),
      row("WAT-a", "water", false),
    ];

    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("WAT-a");
  });
});

describe("nextIncompleteModule — completion", () => {
  it("treats partial progress as incomplete", () => {
    // progress_pct is a display value; only `completed` decides.
    const rows = [
      row("SUR-a", "fundamentals", false, 73),
      row("WAT-a", "water", false),
    ];
    expect(nextIncompleteModule(rows, codeForSlug)?.module_id).toBe("SUR-a");
  });

  it("returns null when the curriculum is complete or empty", () => {
    expect(nextIncompleteModule([row("SUR-a", "fundamentals", true, 100)], codeForSlug)).toBeNull();
    expect(nextIncompleteModule([], codeForSlug)).toBeNull();
    expect(nextIncompleteModule(undefined, codeForSlug)).toBeNull();
  });

  it("stops at the end state rather than resurrecting an earlier region", () => {
    const rows = [
      row("SUR-a", "fundamentals", true, 100),
      row("WAT-a", "water", true, 100),
    ];
    expect(nextIncompleteModule(rows, codeForSlug)).toBeNull();
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
    // The whole point of the CTA: Home → Lesson, with no module page in
    // between.
    const { to } = nextMissionAction(false, false, "WAT-boiling");
    expect(to).toBe("/modules/WAT-boiling/lesson");
    expect(to).not.toBe("/modules/WAT-boiling");
  });
});
