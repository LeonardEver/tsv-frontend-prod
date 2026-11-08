/**
 * Learn — a region atlas with panoramic scenery, illustrated summary
 * tiles, and category artwork. The "Start Here" section continues to
 * recommend beginner missions in the canonical curriculum order.
 *
 * All values authoritative (module counts, completion counts) — nothing
 * fabricated. Category images resolve through the config-driven visual
 * map (lib/category-visuals); categories without registered artwork fall
 * back to their icon identity.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Mountain } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { CategoryCard, MissionCard } from "@/components/sa/cards";
import { EmptyState, SectionHeader, Stat } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchCategories, fetchCategoryDetail } from "./categories.api";
import { fetchAllModules } from "@/features/modules/modules.api";
import { categoryCardModel } from "./adapters";
import { missionCardModelFromListRow } from "@/features/dashboard/adapters";
import { codeFromSlug } from "@/lib/category-visuals";
import { sortModulesByCurriculum } from "@/lib/curriculum";
import panorama from "@/assets/learn-panorama.jpg";
import forest from "@/assets/learn-forest.jpg";
import styles from "./categories.module.css";

export default function CategoriesPage() {
  useInterfaceLocale();
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
  // Curriculum order, not response order: `/modules` is alphabetical by
  // `module_id`, which would surface Agriculture before Survival
  // Fundamentals. Shares lib/curriculum.ts with the Home recommendation so
  // both name the same "up next".
  const beginner = sortModulesByCurriculum(
    modulesQuery.data?.modules ?? [],
    (slug) => categoriesBySlug.get(slug)?.code ?? codeFromSlug(slug) ?? undefined,
  )
    .filter((m) => m.difficulty === "beginner" && !m.completed)
    .slice(0, 4)
    .map((m) => missionCardModelFromListRow(m, categoriesBySlug));

  return (
    <div className={styles.page}>
      <img src={forest} alt="" width={1536} height={1024} className={styles.forest} loading="lazy" />
      <section className={styles.hero} aria-label={uiText("learning:explore_regions_overview_2aa4c1")}>
        <img src={panorama} alt="" width={1920} height={640} className={styles.panorama} fetchPriority="high" />
        <div className={styles.heading}>
          <PageHeader
            eyebrow={uiText("learning:learn_b04837")}
            title={uiText("learning:explore_regions_9be4e2")}
            description={uiText("learning:choose_a_region_and_begin_your_expedition_5d298d")}
          />
        </div>

        <section className={styles.stats} aria-label={uiText("learning:academy_overview_03b502")}>
          <div className={styles.statTile}>
            <Mountain className={styles.statMotif} aria-hidden="true" />
            <Stat label={uiText("learning:regions_039711")} value={categories.length} hint={uiText("learning:open_to_your_plan_7b1340")} />
          </div>
          <div className={styles.statTile}>
            <Stat label={uiText("learning:missions_323ea3")} value={totalMissions} hint={uiText("learning:across_all_regions_ae9969")} />
          </div>
          <div className={styles.statTile}>
            <Compass className={styles.statMotif} aria-hidden="true" />
            <Stat label={uiText("learning:complete_1f5a1a")} value={totalDone} hint={uiText("learning:value_of_the_academy_45eed5", { value0: uiValue(pct) })} color="var(--ember)" />
          </div>
        </section>
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
          <EmptyState title={uiText("learning:no_regions_yet_910604")} description={uiText("learning:content_is_being_prepared_check_back_soon_beed41")} />
        </section>
      ) : (
        <section className={styles.regionSection} aria-label={uiText("learning:regions_039711")}>
          <div className={styles.regionGrid}>
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
                <CategoryCard category={categoryCardModel(cat)} className={styles.regionCard} />
              </div>
            ))}
          </div>
        </section>
      )}

      {beginner.length > 0 && (
        <section className={styles.recommendations}>
          <SectionHeader
            eyebrow={uiText("learning:recommended_9ef937")}
            title={uiText("learning:start_here_477344")}
            description={uiText("learning:short_missions_that_pay_off_immediately_in_ac5c59")}
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
