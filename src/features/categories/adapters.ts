/**
 * Category adapters (Phase 23) — map real API responses into the sa/
 * visual view models. Pure presentation mapping; no business rules.
 */
import type { CategoryDetailResponse, CategoryListResponse } from "@/lib/api/types";
import type { CategoryCardModel, MissionCardModel } from "@/components/sa/types";
import { categoryDescription, categoryImage, categoryTagline } from "@/lib/category-visuals";
import { formatDifficulty } from "@/lib/format/format";
import { getCategoryIdentity } from "./category-identity";

type CategoryRow = CategoryListResponse["categories"][number];
type ModuleRow = CategoryDetailResponse["subcategories"][number]["modules"][number];

/** /categories row → CategoryCardModel (drives CategoryCard + sidebar). */
export function categoryCardModel(row: CategoryRow): CategoryCardModel {
  const identity = getCategoryIdentity(row.code);
  return {
    code: row.code,
    slug: row.slug,
    name: row.title,
    tagline: categoryTagline(row.code),
    description: categoryDescription(row.code),
    missions: row.module_count,
    completed: row.completed_count,
    image: categoryImage(row.code),
    Icon: identity.icon,
  };
}

/** Display label for a subcategory slug ("fire-starting" → "Fire-starting"). */
export function subcategoryLabel(slug: string): string {
  const words = slug.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** /categories/{slug} module row → MissionCardModel. Detail rows carry
 * no description — the card simply renders without one. */
export function missionCardModelFromDetailRow(
  row: ModuleRow,
  categoryCode: string,
  subcategory: string,
): MissionCardModel {
  const progress = row.progress_pct;
  return {
    moduleId: row.module_id,
    categoryCode,
    subcategory,
    title: row.title,
    description: "",
    difficulty: formatDifficulty(row.difficulty),
    minutes: row.estimated_duration ?? 0,
    progress,
    status: row.completed ? "complete" : progress > 0 ? "in-progress" : "available",
    image: categoryImage(categoryCode),
    to: `/modules/${row.module_id}`,
  };
}
