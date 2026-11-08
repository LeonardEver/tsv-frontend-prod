/**
 * Module detail — Mission page (Phase 23). The Lovable reference
 * `src/routes/learn.$category.$module.index.tsx` is the visual source of
 * truth: breadcrumb, full-bleed mission hero, mission objective, the two
 * parallel activity cards (Field Manual / Field Test), What You'll Learn,
 * field resources, related missions.
 *
 * PRODUCT RULE (DEC-022, frontend spec §5.3): Lesson and Quiz are
 * PARALLEL entries. The Quiz is NEVER disabled, grayed out, gated or
 * redirected behind lesson completion.
 *
 * Progress shown here is authoritative backend state (the /modules
 * inventory's progress_pct) formatted for display — the frontend never
 * computes completion. Module-embedded resources carry no availability
 * verdict, so they render as plain rows linking to the resource page —
 * availability is a server verdict, never a frontend guess (Phase 16).
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, ClipboardCheck, ArrowRight } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { catColorForCode, codeFromSlug } from "@/lib/category-visuals";
import { moduleImage } from "@/lib/module-visuals";
import { formatDifficulty } from "@/lib/format/format";
import { MissionCard } from "@/components/sa/cards";
import { Chip, Eyebrow, ProgressBar, SectionHeader } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchAllModules, fetchModule } from "./modules.api";
import { missionCardModelFromListRow } from "@/features/dashboard/adapters";
import { subcategoryLabel } from "@/features/categories/adapters";

export default function ModuleDetailPage() {
  useInterfaceLocale();
  const { moduleId = "" } = useParams();

  const query = useQuery({
    queryKey: queryKeys.content.module(moduleId),
    queryFn: () => fetchModule(moduleId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false, // 404 is a terminal "not available" state
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const modulesQuery = useQuery({
    queryKey: queryKeys.content.modulesAll,
    queryFn: fetchAllModules,
    staleTime: 30 * 60_000,
  });

  if (query.isPending) {
    return (
      <div role="status" aria-label={uiText("learning:loading_mission_e01030")} className="space-y-6">
        <div className="panel h-72 animate-pulse" aria-hidden="true" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel h-52 animate-pulse" aria-hidden="true" />
          <div className="panel h-52 animate-pulse" aria-hidden="true" />
        </div>
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const mod = query.data;
  const categoryRow = categoriesQuery.data?.categories.find((c) => c.slug === mod.category);
  const categoryTitle = categoryRow?.title ?? mod.category;
  const categoryCode = categoryRow?.code ?? codeFromSlug(mod.category) ?? mod.category;
  const color = catColorForCode(categoryCode);
  const image = moduleImage(mod.module_id);

  const listRow = modulesQuery.data?.modules.find((m) => m.module_id === mod.module_id);
  const progress = listRow?.progress_pct ?? (mod.progress.completed ? 100 : 0);

  const categoriesBySlug = new Map(
    (categoriesQuery.data?.categories ?? []).map((c) => [c.slug, { code: c.code, title: c.title }]),
  );
  const related = (modulesQuery.data?.modules ?? [])
    .filter((m) => m.category === mod.category && m.module_id !== mod.module_id)
    .slice(0, 3)
    .map((m) => missionCardModelFromListRow(m, categoriesBySlug));

  return (
    <div>
      <nav aria-label={uiText("learning:breadcrumb_c766e6")} className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to="/categories" className="text-muted-foreground hover:text-foreground">{uiText("learning:regions_039711")}</Link>
        <span className="mx-2 text-muted-foreground">/</span>
        {mod.category ? (
          <Link
            to={`/categories/${mod.category}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {categoryTitle}
          </Link>
        ) : (
          <span className="text-muted-foreground">{uiText("learning:region_0f2171")}</span>
        )}
        <span className="mx-2 text-muted-foreground">/</span>
        <span style={{ color }}>{mod.title}</span>
      </nav>

      <section className="rise panel relative mb-10 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt=""
            width={1200}
            height={750}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/85 to-background/30" />
        <div className="relative max-w-2xl p-6 pt-32 sm:p-10 sm:pt-48">
          <Eyebrow>{uiText("learning:value_mission_3578b6", { value0: uiValue(categoryTitle) })}</Eyebrow>
          <h1 className="page-title mt-2 font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-5xl">
            {mod.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {mod.subcategory ? <Chip color={color}>{subcategoryLabel(mod.subcategory)}</Chip> : null}
            <Chip>{formatDifficulty(mod.difficulty)}</Chip>
            {mod.estimated_duration ? <Chip>{uiText("learning:value_min_b71afd", { value0: uiValue(mod.estimated_duration) })}</Chip> : null}
          </div>
          {mod.description ? (
            <p className="mt-4 text-base text-muted-foreground">{mod.description}</p>
          ) : null}
          <div className="mt-5 max-w-sm">
            <ProgressBar value={progress} color={color} label={uiText("learning:mission_progress_a840f8")} />
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">{uiText("learning:value_complete_82e3c6", { value0: uiValue(progress) })}</p>
          </div>
        </div>
      </section>

      <section className="mb-10 max-w-3xl">
        <Eyebrow>{uiText("learning:mission_objective_f712ff")}</Eyebrow>
        <p className="mt-2 text-lg leading-relaxed">{uiText("learning:work_through_the_field_manual_then_prove_d58b09")}</p>
      </section>

      {/* ── The two learning paths — ALWAYS parallel, NEVER gated (DEC-022) ── */}
      <section className="mb-12 grid gap-4 lg:grid-cols-2">
        {mod.lesson ? (
          <article
            className="panel flex flex-col p-6"
            style={{ borderColor: `color-mix(in oklab, ${color} 24%, var(--border))` }}
          >
            <span
              className="grid size-11 place-items-center rounded-lg"
              style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
            >
              <BookOpen className="size-5" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-wide uppercase">{uiText("learning:field_manual_92d515")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{uiText("learning:learn_the_skill_92511b")}</p>
            <div className="mt-4 flex gap-4 font-mono text-[11px] text-muted-foreground">
              {mod.lesson.estimated_minutes ? <span>{uiText("learning:value_min_b71afd", { value0: uiValue(mod.lesson.estimated_minutes) })}</span> : null}
              <span>{uiText("learning:value_objectives_050cbc", { value0: uiValue(mod.knowledge_items.length) })}</span>
            </div>
            <Link
              to={`/modules/${mod.module_id}/lesson`}
              className="glow-ember mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
            >
              {mod.lesson.completed ? uiText("learning:review_field_manual_3c1e70") : uiText("learning:start_field_manual_1a2be5")}
            </Link>
          </article>
        ) : null}

        {mod.quiz ? (
          <article className="panel flex flex-col p-6">
            <span className="grid size-11 place-items-center rounded-lg bg-surface-3 text-foreground">
              <ClipboardCheck className="size-5" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-wide uppercase">{uiText("learning:field_test_c57e26")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{uiText("learning:test_yourself_a25041")}</p>
            <div className="mt-4 flex gap-4 font-mono text-[11px] text-muted-foreground">
              <span>{uiText("learning:value_questions_efe7c1", { value0: uiValue(mod.quiz.question_count) })}</span>
              <span>{uiText("learning:best_score_value_286dcf", { value0: uiValue(mod.quiz.best_score !== null ? `${mod.quiz.best_score}%` : "—") })}</span>
            </div>
            {/* DEC-022: this action is never disabled — the quiz must be
                reachable without completing the lesson. */}
            <Link
              to={`/modules/${mod.module_id}/quiz`}
              state={{ startQuiz: true }}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              {mod.quiz.attempt_count > 0 ? uiText("learning:take_field_test_again_0b52f0") : uiText("learning:take_field_test_11b61e")}
            </Link>
          </article>
        ) : null}
      </section>

      {mod.knowledge_items.length > 0 && (
        <section className="mb-12 max-w-3xl">
          <SectionHeader eyebrow={uiText("learning:objectives_24d505")} title={uiText("learning:what_you_ll_learn_4f0a06")} />
          <ul className="panel divide-y divide-border">
            {mod.knowledge_items.map((ki) => (
              <li key={ki.knowledge_id} className="flex items-start gap-3 p-4 text-sm">
                <Check className="mt-0.5 size-4 shrink-0" style={{ color }} />
                <span>{ki.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mod.resources.length > 0 && (
        <section className="mb-12">
          <SectionHeader eyebrow={uiText("learning:artifacts_a5b79f")} title={uiText("learning:field_resources_306359")} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mod.resources.map((res) => (
              <div key={res.resource_id} className="panel flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-lg font-mono text-[10px] tracking-wider"
                    style={{
                      background: `color-mix(in oklab, ${color} 16%, var(--surface-2))`,
                      color,
                    }}
                  >
                    {(res.file_format ?? uiText("learning:file_b4915d")).split(" ")[0]}
                  </span>
                  <div className="min-w-0">
                    <Chip color={color}>{res.resource_type}</Chip>
                    <h3 className="mt-1.5 truncate text-sm font-semibold">{res.title}</h3>
                  </div>
                </div>
                <Link
                  to={`/resources/${res.resource_id}`}
                  className="mt-4 inline-flex min-h-9 items-center gap-1.5 self-start rounded-md border border-border px-3 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
                >{uiText("learning:open_cf9b77")}{" "}<ArrowRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <SectionHeader eyebrow={uiText("learning:continue_2e0262")} title={uiText("learning:related_missions_f17d21")} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((m) => (
              <MissionCard key={m.moduleId} mission={m} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
