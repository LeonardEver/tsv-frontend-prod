/**
 * The canonical curriculum progression — the ONE teaching order the whole
 * app shares.
 *
 * Why this file exists
 * --------------------
 * `GET /api/v1/modules` is ordered by `ORDER BY modules.module_id ASC`
 * (backend `src/modules/content/api/repository.ts`), i.e. *alphabetically*.
 * `AGR-composting` therefore sorts ahead of `SUR-*`, and any consumer that
 * trusts the response array as a curriculum sequence recommends Composting
 * to a learner who has not finished their first fundamentals lesson.
 *
 * The curriculum order is not in the module list at all. It lives in
 * `categories.sort_order`, which `GET /categories` exposes as its own array
 * order, and each response row carries the category `code`. So the order is
 * derivable from data the shell already fetches — this module is the single
 * place that derivation is written down.
 *
 * Ordering rule
 * -------------
 * Modules are ranked by (canonical category position, `module_id`). Within a
 * category, `module_id` ascending is exactly what every browse surface
 * already shows — `/modules`, `/categories/{slug}` and the region pages all
 * render the backend's `module_id` order — so this makes Home agree with
 * navigation at every level rather than inventing a second sequence.
 *
 * The backend remains the only authority on *completion*: this module orders
 * and filters, it never decides what is done.
 */

/**
 * `categories.code` values in teaching order — Survival Fundamentals
 * first, Navigation last. This is the progression shown in the sidebar,
 * the Learn page and the region pages, and it is the sequence the Home
 * recommendation must follow.
 *
 * The codes match the backend taxonomy seed (`SUR, WAT, FIR, SHE, FOD,
 * AGR, FOR, MED, NAV`); only these nine are part of the guided curriculum
 * today.
 */
export const CURRICULUM_CATEGORY_CODES = [
  "SUR",
  "WAT",
  "FIR",
  "SHE",
  "FOD",
  "AGR",
  "FOR",
  "MED",
  "NAV",
] as const;

export type CurriculumCategoryCode = (typeof CURRICULUM_CATEGORY_CODES)[number];

const RANK_BY_CODE: ReadonlyMap<string, number> = new Map(
  CURRICULUM_CATEGORY_CODES.map((code, index) => [code, index]),
);

/**
 * Position of a category in the progression.
 *
 * A category that is not part of the curriculum ranks *after* every one
 * that is, so publishing a new region can never push it ahead of the
 * established sequence. Callers sort ascending.
 */
export function curriculumRank(code: string | null | undefined): number {
  if (!code) return CURRICULUM_CATEGORY_CODES.length;
  return RANK_BY_CODE.get(code.toUpperCase()) ?? CURRICULUM_CATEGORY_CODES.length;
}

/** A module row as far as ordering is concerned. */
export interface CurriculumModuleRow {
  module_id: string;
  /** Backend category *slug* on `/modules` rows. */
  category: string;
  completed: boolean;
}

/**
 * Module rows re-ordered into curriculum sequence. Pure and non-mutating,
 * so every surface that lists modules can render the same order the
 * recommendation walks — Learn's "Start Here" strip included.
 *
 * `codeForSlug` resolves a module row's category slug to a category code;
 * pass the map built from `/categories` so the resolution uses the server's
 * own taxonomy rather than a guess.
 */
export function sortModulesByCurriculum<T extends CurriculumModuleRow>(
  rows: readonly T[],
  codeForSlug: (slug: string) => string | undefined,
): T[] {
  return [...rows].sort((a, b) => {
    const rankA = curriculumRank(codeForSlug(a.category));
    const rankB = curriculumRank(codeForSlug(b.category));
    if (rankA !== rankB) return rankA - rankB;
    return a.module_id.localeCompare(b.module_id);
  });
}

/**
 * The next module to teach: the first incomplete module in curriculum
 * order, or `null` when every module is complete.
 *
 * This is a strict queue. A module that is partially done is still
 * "current", so the learner finishes it before moving on — the scan never
 * skips ahead to a later category while an earlier one has anything
 * outstanding.
 */
export function nextIncompleteModule<T extends CurriculumModuleRow>(
  rows: readonly T[] | undefined,
  codeForSlug: (slug: string) => string | undefined,
): T | null {
  if (!rows || rows.length === 0) return null;

  return sortModulesByCurriculum(rows, codeForSlug).find((row) => !row.completed) ?? null;
}
