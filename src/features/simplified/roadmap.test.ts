import { describe, expect, it } from "vitest";
import type { CategoryListResponse, ModuleListResponse } from "@/lib/api/types";
import { buildGuidedRoadmap } from "./roadmap";

const categories = [
  { slug: "water", code: "WAT", title: "Water", module_count: 1, completed_count: 0 },
  { slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 2, completed_count: 0 },
] satisfies CategoryListResponse["categories"];

const modules = [
  { module_id: "WAT-01", title: "Water", category: "water", difficulty: "beginner", estimated_duration: 10, description: null, completed: false, progress_pct: 0 },
  { module_id: "SUR-02", title: "Preparedness", category: "survival-fundamentals", difficulty: "beginner", estimated_duration: 10, description: null, completed: false, progress_pct: 20 },
  { module_id: "SUR-01", title: "Planning", category: "survival-fundamentals", difficulty: "beginner", estimated_duration: 10, description: null, completed: true, progress_pct: 100 },
] satisfies ModuleListResponse["modules"];

describe("buildGuidedRoadmap", () => {
  it("stays in the first incomplete category and exposes one current mission", () => {
    const roadmap = buildGuidedRoadmap(categories, modules);
    expect(roadmap?.category.code).toBe("SUR");
    expect(roadmap?.current?.module_id).toBe("SUR-02");
    expect(roadmap?.modules.map((stop) => stop.status)).toEqual(["completed", "current"]);
  });

  it("advances only after every mission in the category is complete", () => {
    const completed = modules.map((module) => module.category === "survival-fundamentals" ? { ...module, completed: true, progress_pct: 100 } : module);
    expect(buildGuidedRoadmap(categories, completed)?.category.code).toBe("WAT");
  });
});