import type { CategoryListResponse, ModuleListResponse } from "@/lib/api/types";
import { sortModulesByCurriculum } from "@/lib/curriculum";
import { codeFromSlug } from "@/lib/category-visuals";

export type RoadmapStatus = "completed" | "current" | "locked";
export type ModuleRow = ModuleListResponse["modules"][number];

export interface RoadmapStop {
  module: ModuleRow;
  status: RoadmapStatus;
}

export interface GuidedRoadmap {
  category: CategoryListResponse["categories"][number];
  modules: RoadmapStop[];
  current: ModuleRow | null;
  progress: number;
}

export function buildGuidedRoadmap(
  categories: CategoryListResponse["categories"],
  modules: ModuleListResponse["modules"],
): GuidedRoadmap | null {
  if (categories.length === 0 || modules.length === 0) return null;
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const ordered = sortModulesByCurriculum(modules, (slug) =>
    categoryBySlug.get(slug)?.code ?? codeFromSlug(slug) ?? undefined,
  );
  const firstIncomplete = ordered.find((module) => !module.completed) ?? null;
  const category = firstIncomplete
    ? categoryBySlug.get(firstIncomplete.category)
    : categoryBySlug.get(ordered[ordered.length - 1]?.category ?? "");
  if (!category) return null;

  const categoryModules = ordered.filter((module) => module.category === category.slug);
  const current = categoryModules.find((module) => !module.completed) ?? null;
  const firstOpenIndex = current ? categoryModules.indexOf(current) : categoryModules.length;
  const roadmap = categoryModules.map((module, index): RoadmapStop => ({
    module,
    status: module.completed ? "completed" : index === firstOpenIndex ? "current" : "locked",
  }));
  const progress = categoryModules.length > 0
    ? Math.round(categoryModules.reduce((sum, module) => sum + module.progress_pct, 0) / categoryModules.length)
    : 0;

  return { category, modules: roadmap, current, progress };
}