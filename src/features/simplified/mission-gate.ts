/**
 * The Simplified sequence gate — completion, not entitlement.
 *
 * PRO decides whether a learner may open a field test from the plan's
 * `quiz_before_lesson` entitlement (`features/quiz/use-field-test-gate`), so a
 * paid plan may test itself at any time. The Simplified experience is
 * deliberately more sequential:
 *
 *     Learn → Practice → Apply → Complete → Field test
 *
 * so here the mission's OWN lesson must be complete first — on Free, Survivor
 * and Operator alike. A paid learner cannot step off the guided path into a
 * test for a mission they have not finished.
 *
 * What this deliberately does NOT do:
 *   - it does not read, copy or reinterpret plan entitlements;
 *   - it does not touch the shared hook, so PRO's rule is untouched;
 *   - it is not an enforcement authority. The backend still owns every
 *     attempt. This decides only what the Simplified UI is willing to offer.
 *
 * It reads the module DETAIL, which both Simplified mission screens already
 * hold, so the gate costs no extra request and has no failure mode of its own:
 * if that read fails, the page has already rendered its own error state.
 */
import type { ModuleDetailResponse } from "@/lib/api/types";

export type MissionGate =
  /** The module detail has not resolved yet. */
  | "checking"
  /** The lesson is complete — the field test may be offered. */
  | "open"
  /** The lesson is not complete — the field test stays shut. */
  | "locked";

/**
 * Derive the gate from the module detail.
 *
 * `lesson === null` means the module ships no lesson, so there is no sequence
 * to enforce and nothing a learner could complete first; the gate opens and
 * lets the backend decide, rather than deadlocking the screen on a condition
 * that can never be satisfied.
 *
 * `lesson.completed` and `progress.lesson_completed` are both backend-derived
 * and agree; either one opening the gate is the honest reading.
 */
export function missionGateFrom(module: ModuleDetailResponse | undefined): MissionGate {
  if (!module) return "checking";
  if (!module.lesson) return "open";
  return module.lesson.completed || module.progress.lesson_completed ? "open" : "locked";
}
