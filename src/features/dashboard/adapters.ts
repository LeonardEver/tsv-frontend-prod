/**
 * Dashboard adapters (Phase 23) — map real API responses into the sa/
 * visual view models. Pure presentation mapping; no business rules.
 */
import { communityCategoryTitle } from "@/i18n/community-category";
import { tr } from "@/i18n";
import type { CommunityPostsResponse, ModuleListResponse } from "@/lib/api/types";
import type { CommunityPostModel, MissionCardModel } from "@/components/sa/types";
import { codeFromSlug } from "@/lib/category-visuals";
import { moduleImage } from "@/lib/module-visuals";
import { nextIncompleteModule as nextIncompleteModuleOrdered } from "@/lib/curriculum";
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
    image: moduleImage(row.module_id),
    to: `/modules/${row.module_id}`,
  };
}

/**
 * The next mission to recommend: the first module in CURRICULUM order
 * that is not `completed`, or `null` when the whole curriculum is done.
 *
 * The response array is not the curriculum. `/modules` is ordered
 * alphabetically by `module_id`, so trusting it recommends `AGR-composting`
 * to a learner who has not finished their first fundamentals lesson. The
 * sequence lives in `lib/curriculum.ts`, which ranks by canonical category
 * position and then `module_id` — the same order the sidebar, the Learn
 * page and every region page render.
 *
 * `completed` is still the backend's derived flag, never a frontend guess:
 * a module with partial progress counts as incomplete, so the learner
 * finishes it before the queue advances. Nothing is gated on this — it
 * selects what to recommend, not what a learner may open.
 */
export function nextIncompleteModule(
  rows: readonly ModuleRow[] | undefined,
  codeForSlug: (slug: string) => string | undefined,
): ModuleRow | null {
  return nextIncompleteModuleOrdered(rows, codeForSlug);
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
    return { to: `/modules/${moduleId}/lesson`, ctaLabel: tr("common:takeLesson") };
  }
  return {
    to: `/modules/${moduleId}/quiz`,
    ctaLabel: quizAttempted ? tr("common:retakeQuiz") : tr("common:takeQuiz"),
  };
}

/** /community/posts row → CommunityPostModel. */
export function communityPostModel(row: CommunityPostsResponse["posts"][number]): CommunityPostModel {
  return {
    id: String(row.post_id),
    title: row.title,
    excerpt: row.body_excerpt ?? "",
    author: row.author.display_name,
    get category() { return communityCategoryTitle(row.category_code, row.category_name); },
    votes: row.vote_score,
    comments: row.comment_count,
    time: formatRelativeTime(row.created_at),
    own: row.mine,
  };
}
