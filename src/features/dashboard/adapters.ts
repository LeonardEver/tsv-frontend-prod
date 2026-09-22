/**
 * Dashboard adapters (Phase 23) — map real API responses into the sa/
 * visual view models. Pure presentation mapping; no business rules.
 */
import type { CommunityPostsResponse, ModuleListResponse } from "@/lib/api/types";
import type { CommunityPostModel, MissionCardModel } from "@/components/sa/types";
import { categoryImage, codeFromSlug } from "@/lib/category-visuals";
import { formatDifficulty, formatRelativeTime } from "@/lib/format/format";

type ModuleRow = ModuleListResponse["modules"][number];

/** /modules list row → MissionCardModel. List rows carry the
 * authoritative progress_pct but no subcategory — the subcategory chip
 * is rendered only when present. */
export function missionCardModelFromListRow(
  row: ModuleRow,
  categoriesBySlug: Map<string, { code: string; title: string }>,
): MissionCardModel {
  const category = categoriesBySlug.get(row.category);
  const code = category?.code ?? codeFromSlug(row.category) ?? row.category;
  const progress = row.progress_pct;
  return {
    moduleId: row.module_id,
    categoryCode: code,
    subcategory: "",
    title: row.title,
    description: row.description ?? "",
    difficulty: formatDifficulty(row.difficulty),
    minutes: row.estimated_duration ?? 0,
    progress,
    status: row.completed ? "complete" : progress > 0 ? "in-progress" : "available",
    image: categoryImage(code),
    to: `/modules/${row.module_id}`,
  };
}

/**
 * The next mission to recommend: the first module in the server's own
 * order that is not `completed`, or `null` when the whole curriculum is
 * done.
 *
 * Ordering is a property of the response, not something computed here —
 * `/modules` returns the canonical curriculum sequence, which is also how
 * the region pages present it and how the expedition trail reads it. No
 * client-side sort is applied, so the recommendation can never disagree
 * with what the learner sees when they browse.
 *
 * `completed` is the backend's derived flag, never a frontend guess: a
 * module with partial progress still counts as incomplete, and the server
 * remains the only authority on what "done" means. Nothing is gated on
 * this — it selects what to recommend, not what a learner may open.
 */
export function nextIncompleteModule(
  rows: readonly ModuleRow[] | undefined,
): ModuleRow | null {
  return (rows ?? []).find((row) => !row.completed) ?? null;
}

/**
 * Where the recommended mission's CTA goes, and what it says.
 *
 * The flow is Home → Lesson → Quiz, so the lesson is the target until the
 * backend reports it completed; after that the next action is the field
 * test. Both flags are the server's.
 */
export function nextMissionAction(
  lessonDone: boolean,
  quizAttempted: boolean,
  moduleId: string,
): { to: string; ctaLabel: string } {
  if (!lessonDone) {
    return { to: `/modules/${moduleId}/lesson`, ctaLabel: "Take lesson" };
  }
  return {
    to: `/modules/${moduleId}/quiz`,
    ctaLabel: quizAttempted ? "Retake quiz" : "Take quiz",
  };
}

/** /community/posts row → CommunityPostModel. */
export function communityPostModel(row: CommunityPostsResponse["posts"][number]): CommunityPostModel {
  return {
    id: String(row.post_id),
    title: row.title,
    excerpt: row.body_excerpt ?? "",
    author: row.author.display_name,
    category: row.category_name,
    votes: row.vote_score,
    comments: row.comment_count,
    time: formatRelativeTime(row.created_at),
    own: row.mine,
  };
}
