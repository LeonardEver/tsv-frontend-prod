/**
 * The guided roadmap, assembled from the canonical content reads.
 *
 * ONE definition, shared by the Simplified Home and the field-test result.
 * The result screen has to answer "what comes next?" after an attempt, and it
 * must answer it the SAME way Home does — a second, local progression rule
 * would be a second source of truth for the curriculum. Both call this hook,
 * which reduces the real `/categories` + `/modules` payloads through
 * `buildGuidedRoadmap`, which in turn orders by `lib/curriculum` — the same
 * order the PRO dashboard recommends from.
 *
 * The shape is a discriminated status rather than nullable fields so a caller
 * cannot read `roadmap` in a state where it does not exist yet.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchAllModules } from "@/features/modules/modules.api";
import { buildGuidedRoadmap, type GuidedRoadmap } from "./roadmap";

/**
 * The curriculum moves slowly and both reads are already made by the shell and
 * the PRO dashboard; a long stale window keeps navigation between Simplified
 * screens free of refetches. Completion is still invalidated explicitly by the
 * completion and submission mutations, so a finished mission re-ranks at once.
 */
const CONTENT_STALE_MS = 30 * 60_000;

export type GuidedRoadmapState =
  | { status: "pending" }
  | { status: "error"; error: unknown; retry: () => void }
  | { status: "empty" }
  | { status: "ready"; roadmap: GuidedRoadmap };

export function useGuidedRoadmap(): GuidedRoadmapState {
  const categories = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: CONTENT_STALE_MS,
  });
  const modules = useQuery({
    queryKey: queryKeys.content.modulesAll,
    queryFn: fetchAllModules,
    staleTime: CONTENT_STALE_MS,
  });

  const retry = (): void => {
    void categories.refetch();
    void modules.refetch();
  };

  // A failed read outranks a pending one: with either source missing there is
  // no roadmap to draw, and the caller should offer recovery rather than spin.
  if (categories.isError) return { status: "error", error: categories.error, retry };
  if (modules.isError) return { status: "error", error: modules.error, retry };
  if (categories.isPending || modules.isPending) return { status: "pending" };

  const roadmap = buildGuidedRoadmap(categories.data.categories, modules.data.modules);
  // No published content is a real, non-error answer: the curriculum is empty.
  if (!roadmap) return { status: "empty" };

  return { status: "ready", roadmap };
}
