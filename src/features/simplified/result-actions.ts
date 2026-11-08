/**
 * Where a Simplified field-test result leads next.
 *
 * The target is already decided by the canonical roadmap; this only turns it
 * into the honest label for the three cases the learner can be in:
 *
 *   - the attempt did not complete the mission → keep going with the SAME one
 *     (`nextMissionId === missionId`), which is also what an unsuccessful
 *     attempt produces — no progress is reset, the learner simply continues;
 *   - the mission is done → the next incomplete mission in the region;
 *   - the region is finished → back to the expedition path.
 *
 * Keeping the decision here means the shared result view stays purely
 * presentational: it renders a target it is handed and never learns what a
 * "region" or a "curriculum order" is.
 */

import { tr as uiText } from "@/i18n";
export interface SimplifiedResultAction {
  to: string;
  label: string;
}

export function simplifiedResultActions(
  missionId: string,
  nextMissionId: string | null,
): SimplifiedResultAction {
  if (nextMissionId === null) return { to: "/simplified", get label() { return uiText("learning:back_to_expedition_2b65a5"); } };
  if (nextMissionId === missionId) {
    return { to: `/simplified/missions/${missionId}`, get label() { return uiText("learning:continue_mission_498583"); } };
  }
  return { to: `/simplified/missions/${nextMissionId}`, get label() { return uiText("learning:next_mission_f2974d"); } };
}
