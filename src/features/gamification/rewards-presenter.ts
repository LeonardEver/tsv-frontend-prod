import type { GamificationSummaryResponse } from "@/lib/api/types";
import { tr } from "@/i18n";

// Presentation names mirrored from backend/src/modules/gamification/config.ts.
// The server still chooses the user's level, title, remaining XP and awards.
export const RANK_NAMES = [
  "Novice", "Prepared", "Practitioner", "Skilled", "Expert",
  "Master", "Grandmaster", "Legend", "Mythic", "Transcendent",
] as const;

export function rankName(level: number): string {
  const keys = ["rankNovice", "rankPrepared", "rankPractitioner", "rankSkilled", "rankExpert", "rankMaster", "rankGrandmaster", "rankLegend", "rankMythic", "rankTranscendent"] as const;
  const key = keys.at(level - 1);
  return key ? tr(key) : tr("settings:level_value_c5bf02", { value0: level });
}

export function rankTitle(level: number, canonicalTitle: string): string {
  return RANK_NAMES.at(level - 1) === canonicalTitle ? rankName(level) : canonicalTitle;
}

/** Cumulative XP toward the next rank, not progress within a level band.
 * Both terms come from the same API snapshot; no local XP curve is used. */
export function nextRankTarget(summary: GamificationSummaryResponse) {
  const remaining = summary.xp_to_next_level;
  if (remaining === null || remaining < 0 || summary.total_xp < 0) return null;
  const total = summary.total_xp + remaining;
  if (!Number.isFinite(total) || total <= 0) return null;
  return { total, pct: (summary.total_xp / total) * 100 };
}

export function visibleRanks(summary: GamificationSummaryResponse) {
  const start = Math.max(0, Math.min(summary.level - 3, RANK_NAMES.length - 5));
  return RANK_NAMES.slice(start, start + 5).map((_, index) => ({
    level: start + index + 1,
    title: start + index + 1 === summary.level ? rankTitle(summary.level, summary.level_title) : rankName(start + index + 1),
  }));
}
