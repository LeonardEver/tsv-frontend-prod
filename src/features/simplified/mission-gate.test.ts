import { describe, expect, it } from "vitest";
import type { ModuleDetailResponse } from "@/lib/api/types";
import { missionGateFrom } from "./mission-gate";

/** A real module detail. Only the fields the gate reads are ever varied. */
function module(overrides: {
  lessonCompleted?: boolean;
  lessonProgressCompleted?: boolean;
  noLesson?: boolean;
  quizAttempted?: boolean;
}): ModuleDetailResponse {
  return {
    module_id: "SUR-02",
    title: "Preparedness Planning",
    description: null,
    category: "survival-fundamentals",
    subcategory: null,
    difficulty: "beginner",
    estimated_duration: 10,
    content_version: 1,
    knowledge_items: [],
    lesson: overrides.noLesson
      ? null
      : {
          lesson_id: "SUR-02-L01",
          title: "Preparedness Planning",
          estimated_minutes: 10,
          completed: overrides.lessonCompleted ?? false,
        },
    quiz: {
      quiz_id: "SUR-02-Q01",
      title: "Field Test",
      question_count: 5,
      best_score: overrides.quizAttempted ? 100 : null,
      attempt_count: overrides.quizAttempted ? 3 : 0,
    },
    resources: [],
    progress: {
      lesson_completed: overrides.lessonProgressCompleted ?? false,
      quiz_best_score: overrides.quizAttempted ? 100 : null,
      completed: false,
    },
  } satisfies ModuleDetailResponse;
}

describe("missionGateFrom — the Simplified sequence gate", () => {
  it("stays undecided until the module resolves", () => {
    expect(missionGateFrom(undefined)).toBe("checking");
  });

  it("locks an unfinished mission", () => {
    expect(missionGateFrom(module({}))).toBe("locked");
  });

  it("opens once the lesson is complete", () => {
    expect(missionGateFrom(module({ lessonCompleted: true }))).toBe("open");
  });

  it("accepts the module-level progress flag as well as the lesson flag", () => {
    expect(missionGateFrom(module({ lessonProgressCompleted: true }))).toBe("open");
  });

  it("opens for a module with no lesson (nothing to complete first)", () => {
    expect(missionGateFrom(module({ noLesson: true }))).toBe("open");
  });

  /**
   * The gate reads completion ONLY. Nothing a plan or a previous attempt can
   * put in the payload opens it for an unfinished mission — that is the whole
   * point of the Simplified sequence, and it is what makes the gate behave
   * identically on Free, Survivor and Operator.
   */
  it("ignores every non-completion signal, including past attempts", () => {
    expect(missionGateFrom(module({ quizAttempted: true }))).toBe("locked");
  });

  it("does not complete a mission just because its quiz was passed", () => {
    const passedButUnfinished = module({ quizAttempted: true });
    expect(passedButUnfinished.quiz?.best_score).toBe(100);
    expect(missionGateFrom(passedButUnfinished)).toBe("locked");
  });
});
