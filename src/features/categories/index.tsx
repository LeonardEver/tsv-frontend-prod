/**
 * Learn — Explore Regions (Phase 23). The Lovable reference
 * `src/routes/learn.index.tsx` is the visual source of truth: stat tiles,
 * all regions as CategoryCards with generated artwork, and a "Start Here"
 * section of beginner missions.
 *
 * All values authoritative (module counts, completion counts) — nothing
 * fabricated. Category images resolve through the config-driven visual
 * map (lib/category-visuals); categories without registered artwork fall
 * back to their icon identity.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { CategoryCard, MissionCard } from "@/components/sa/cards";
import { EmptyState, SectionHeader, Stat } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchCategories, fetchCategoryDetail } from "./categories.api";
import { fetchAllModules } from "@/features/modules/modules.api";
import { categoryCardModel } from "./adapters";
import { missionCardModelFromListRow } from "@/features/dashboard/adapters";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const modulesQuery = useQuery({
    queryKey: queryKeys.content.modulesAll,
    queryFn: fetchAllModules,
    staleTime: 30 * 60_000,
  });

  const categories = query.data?.categories ?? [];
  const totalMissions = categories.reduce((a, c) => a + c.module_count, 0);
  const totalDone = categories.reduce((a, c) => a + c.completed_count, 0);
  const pct = totalMissions > 0 ? Math.round((totalDone / totalMissions) * 100) : 0;

  const categoriesBySlug = new Map(categories.map((c) => [c.slug, { code: c.code, title: c.title }]));
  const beginner = (modulesQuery.data?.modules ?? [])
    .filter((m) => m.difficulty === "beginner" && !m.completed)
    .slice(0, 4)
    .map((m) => missionCardModelFromListRow(m, categoriesBySlug));

  return (
    <div>
      <PageHeader
        eyebrow="Learn"
        title="Explore Regions"
        description="Choose a region and begin your expedition. Each region holds a set of missions, field manuals and field tests."
      />

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Regions" value={categories.length} hint="Open to your plan" />
        <Stat label="Missions" value={totalMissions} hint="Across all regions" />
        <Stat label="Complete" value={totalDone} hint={`${pct}% of the academy`} color="var(--ember)" />
      </section>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <section className="mb-12" aria-hidden="true">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="panel h-56 animate-pulse" />
            <div className="panel h-56 animate-pulse" />
            <div className="panel h-56 animate-pulse" />
          </div>
        </section>
      ) : categories.length === 0 ? (
        <section className="mb-12">
          <EmptyState title="No regions yet" description="Content is being prepared. Check back soon." />
        </section>
      ) : (
        <section className="mb-12">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.slug}
                onMouseEnter={() => {
                  void queryClient.prefetchQuery({
                    queryKey: queryKeys.content.category(cat.slug),
                    queryFn: () => fetchCategoryDetail(cat.slug),
                    staleTime: 30 * 60_000,
                  });
                }}
              >
                <CategoryCard category={categoryCardModel(cat)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {beginner.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="Recommended"
            title="Start Here"
            description="Short missions that pay off immediately in the field."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {beginner.map((m) => (
              <MissionCard key={m.moduleId} mission={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
