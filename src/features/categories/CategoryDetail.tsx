/**
 * Category detail — Region page (Phase 23). The Lovable reference
 * `src/routes/learn.$category.index.tsx` is the visual source of truth:
 * breadcrumb, full-bleed hero (category artwork, scrim, colored title,
 * chips, ProgressRing), missions grouped by subcategory.
 *
 * Loading / empty / error-with-retry / 404 (existence-hiding) preserved.
 * Progress derives from authoritative counts only (the /categories list
 * row; the detail rows' completed flags as the fallback).
 */
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import {
  catColorForCode,
  categoryDescription,
  categoryImage,
  categoryTagline,
} from "@/lib/category-visuals";
import type { CategoryCardModel } from "@/components/sa/types";
import { MissionCard } from "@/components/sa/cards";
import {
  Chip,
  EmptyState,
  Eyebrow,
  ProgressBar,
  ProgressRing,
  SectionHeader,
} from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import { getCategoryIdentity } from "./category-identity";
import { fetchCategories, fetchCategoryDetail } from "./categories.api";
import { missionCardModelFromDetailRow, subcategoryLabel } from "./adapters";

export default function CategoryDetailPage() {
  const { categorySlug = "" } = useParams();

  const query = useQuery({
    queryKey: queryKeys.content.category(categorySlug),
    queryFn: () => fetchCategoryDetail(categorySlug),
    staleTime: 30 * 60_000,
    retry: false, // 404 is a terminal "not available" state
  });

  const listQuery = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const detail = query.data;
  const listRow = listQuery.data?.categories.find((c) => c.slug === categorySlug);

  const moduleRows = detail?.subcategories.flatMap((s) => s.modules) ?? [];
  const missionCount = listRow?.module_count ?? moduleRows.length;
  const completedCount =
    listRow?.completed_count ?? moduleRows.filter((m) => m.completed).length;
  const pct = missionCount > 0 ? Math.round((completedCount / missionCount) * 100) : 0;
  const groups = detail?.subcategories ?? [];

  const model: CategoryCardModel | null = detail
    ? {
        code: detail.code,
        slug: detail.slug,
        name: detail.title,
        tagline: categoryTagline(detail.code),
        description: categoryDescription(detail.code),
        missions: missionCount,
        completed: completedCount,
        image: categoryImage(detail.code),
        Icon: getCategoryIdentity(detail.code).icon,
      }
    : null;

  const color = catColorForCode(detail?.code ?? model?.code);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to="/categories" className="text-muted-foreground hover:text-foreground">
          Regions
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        {model ? <span style={{ color }}>{model.name}</span> : null}
      </nav>

      {query.isPending ? (
        <div className="panel h-64 animate-pulse" aria-hidden="true" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : detail && model ? (
        <>
          <section
            className="rise panel relative mb-10 overflow-hidden"
            style={{ borderColor: `color-mix(in oklab, ${color} 26%, var(--border))` }}
          >
            {model.image ? (
              <img
                src={model.image}
                alt=""
                width={1200}
                height={750}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-surface-2">
                <model.Icon className="size-16" style={{ color }} aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-r from-background via-background/88 to-background/25" />
            <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0 max-w-xl">
                <Eyebrow>Region</Eyebrow>
                <h1
                  className="page-title mt-2 font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-5xl"
                  style={{ color }}
                >
                  {model.name}
                </h1>
                <p className="mt-3 text-base text-muted-foreground">{categoryDescription(detail.code)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip color={color}>{missionCount} missions</Chip>
                  <Chip>{completedCount} complete</Chip>
                  <Chip>{groups.length} sections</Chip>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ProgressRing value={pct} color={color} size={96}>
                  <span className="font-display text-xl font-semibold">{pct}%</span>
                </ProgressRing>
                <div className="max-w-40">
                  <p className="eyebrow">Region progress</p>
                  <ProgressBar className="mt-2" value={pct} color={color} label="Region progress" />
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {completedCount} of {missionCount} missions
                  </p>
                </div>
              </div>
            </div>
          </section>

          {moduleRows.length === 0 ? (
            <EmptyState
              title="No missions yet"
              description="This region is being built. Field manuals will appear here as soon as they are published."
            />
          ) : (
            groups.map((group) => (
              <section key={group.slug} className="mb-12">
                <SectionHeader eyebrow="Section" title={subcategoryLabel(group.slug)} />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.modules.map((m) => (
                    <MissionCard
                      key={m.module_id}
                      mission={missionCardModelFromDetailRow(m, detail.code, subcategoryLabel(group.slug))}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
