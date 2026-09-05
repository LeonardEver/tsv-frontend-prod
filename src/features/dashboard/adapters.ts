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
