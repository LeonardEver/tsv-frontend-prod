/**
 * SURVIVAL ACADEMY — sa/ cards (Phase 23).
 * Faithful port of the Lovable reference `src/components/sa/cards.tsx`,
 * adapted to react-router and real backend data shapes (via the view
 * models in ./types). Visual recipes kept verbatim.
 *
 * VISUAL COMPONENTS — presentation only. Every one receives props; none
 * of them contains a business rule. Entitlement/limit decisions and API
 * actions come from props.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { formatResourceType } from "@/lib/format/format";
import { Link } from "react-router";
import type { CSSProperties } from "react";
import { Check, Download, Eye, Lock, Clock, MessageSquare, ArrowBigUp } from "lucide-react";
import { cn, Avatar, Chip, Eyebrow, ProgressBar } from "./primitives";
import { catColorForCode } from "@/lib/category-visuals";
import type {
  AchievementModel,
  CategoryCardModel,
  CommunityPostModel,
  FieldResourceModel,
  MissionCardModel,
} from "./types";

export function CategoryCard({ category, className }: { category: CategoryCardModel; className?: string }) {
  useInterfaceLocale();
  const color = catColorForCode(category.code);
  const pct = category.missions > 0 ? Math.round((category.completed / category.missions) * 100) : 0;
  return (
    <Link
      to={`/categories/${category.slug}`}
      className={cn("group panel relative block overflow-hidden transition-transform duration-200 hover:-translate-y-0.5", className)}
      style={{ "--region-accent": color, borderColor: `color-mix(in oklab, ${color} var(--region-border-strength, 22%), var(--border))` } as CSSProperties}
    >
      <div data-region-image className="relative h-32 overflow-hidden sm:h-36">
        {category.image ? (
          <img
            src={category.image}
            alt=""
            loading="lazy"
            width={1200}
            height={750}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center bg-surface-2">
            <category.Icon className="size-10" style={{ color }} aria-hidden="true" />
          </div>
        )}
        <div data-region-shade className="absolute inset-0 bg-linear-to-t from-surface via-surface/60 to-transparent" />
        <span
          className="absolute top-3 left-3 h-6 w-1 rounded-full"
          style={{ background: color, boxShadow: `0 0 14px ${color}` }}
        />
      </div>
      <div data-region-content className="relative -mt-8 p-4">
        <h3 className="text-lg font-semibold tracking-wide uppercase" style={{ color }}>
          {category.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{category.tagline}</p>
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>{uiText("common:value_missions_d4bb5e", { value0: uiValue(category.missions) })}</span>
          <span>{uiText("common:value_complete_732282", { value0: uiValue(category.completed) })}</span>
        </div>
        <ProgressBar value={pct} color={color} className="mt-2" label={uiText("common:value_progress_8196fd", { value0: uiValue(category.name) })} />
      </div>
    </Link>
  );
}

export function MissionCard({ mission, compact = false }: { mission: MissionCardModel; compact?: boolean | undefined }) {
  useInterfaceLocale();
  const color = catColorForCode(mission.categoryCode);
  const locked = mission.status === "locked";
  return (
    <Link
      to={mission.to}
      aria-disabled={locked}
      className={cn(
        "group panel flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5",
        locked && "opacity-60",
      )}
    >
      <div className={cn("relative overflow-hidden", compact ? "h-24" : "h-36")}>
        {mission.image ? (
          <img
            src={mission.image}
            alt=""
            loading="lazy"
            width={1200}
            height={750}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="size-full bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-surface/95 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          {mission.subcategory ? <Chip color={color}>{mission.subcategory}</Chip> : null}
          {mission.status === "complete" && (
            <Chip color="var(--success)">
              <Check className="size-3" />{" "}{uiText("common:complete_1f5a1a")}</Chip>
          )}
          {locked && (
            <Chip>
              <Lock className="size-3" />{" "}{uiText("common:locked_a79888")}</Chip>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Eyebrow>{uiText("common:mission_e4698d")}</Eyebrow>
        <h3 className="mt-1 text-base font-semibold tracking-wide uppercase">{mission.title}</h3>
        {mission.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{mission.description}</p>
        ) : null}
        <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span>{mission.difficulty}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {mission.minutes}{" "}{uiText("common:min_b6c935")}</span>
        </div>
        <div className="mt-auto pt-3">
          <ProgressBar value={mission.progress} color={color} label={uiText("common:value_progress_8196fd", { value0: uiValue(mission.title) })} />
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{uiText("common:value_complete_82e3c6", { value0: uiValue(mission.progress) })}</p>
        </div>
      </div>
    </Link>
  );
}

export function MissionHero({
  mission,
  ctaLabel = "Enter mission",
  className,
}: {
  mission: MissionCardModel;
  /** CTA copy — the deterministic next-step rule lives in the feature
   * layer (Start lesson / Take quiz / Retake quiz). */
  ctaLabel?: string;
  className?: string;
}) {
  useInterfaceLocale();
  const color = catColorForCode(mission.categoryCode);
  return (
    <article
      className={cn("panel relative overflow-hidden", className)}
      style={{ borderColor: `var(--mission-hero-border, color-mix(in oklab, ${color} 26%, var(--border)))` }}
    >
      {mission.image ? <img
        src={mission.image}
        alt=""
        width={1200}
        height={750}
        className="absolute inset-0 size-full object-cover"
      /> : null}
      <div data-hero-shade className="absolute inset-0 bg-linear-to-r from-background via-background/90 to-background/30" />
      <div className="relative p-6">
        <div data-mission-copy className="min-w-0 max-w-xl">
          <Eyebrow>{uiText("common:your_next_mission_00127f")}</Eyebrow>
          <h2 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-wide uppercase sm:text-5xl">
            {mission.title}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">{mission.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip color={color}>{mission.categoryCode}</Chip>
            <Chip>{mission.difficulty}</Chip>
            <Chip>{uiText("common:value_min_b71afd", { value0: uiValue(mission.minutes) })}</Chip>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-6">
            <div className="min-w-32 flex-1">
              <ProgressBar value={mission.progress} color={color} label={uiText("common:mission_progress_a840f8")} />
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">{uiText("common:value_complete_82e3c6", { value0: uiValue(mission.progress) })}</p>
            </div>
            <Link
              data-mission-action
              to={mission.to}
              state={{ startQuiz: true }}
              className="glow-ember inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
            >
              {ctaLabel} →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ResourceCard({
  resource,
  canDownload,
  downloadHref,
}: {
  resource: FieldResourceModel;
  canDownload: boolean;
  /** Real download endpoint (feature-computed; never exposed to users as
   * a decision — the backend still verifies the entitlement). */
  downloadHref: string;
}) {
  useInterfaceLocale();
  const color = catColorForCode(resource.categoryCode);
  return (
    <div className="panel flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg font-mono text-[10px] tracking-wider"
          style={{ background: `color-mix(in oklab, ${color} 16%, var(--surface-2))`, color }}
        >
          {resource.format.split(" ")[0]}
        </span>
        <div className="min-w-0">
          <Chip color={color}>{formatResourceType(resource.kind)}</Chip>
          <h3 className="mt-1.5 truncate text-sm font-semibold">{resource.title}</h3>
        </div>
      </div>
      {resource.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {resource.available ? (
          <>
            <Link
              to={`/resources/${resource.resourceId}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              <Eye className="size-3.5" />{" "}{uiText("common:open_cf9b77")}</Link>
            {canDownload ? (
              <a
                href={downloadHref}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary/15 px-3 text-xs font-semibold tracking-wide text-primary uppercase transition-colors hover:bg-primary/25"
              >
                <Download className="size-3.5" />{" "}{uiText("common:download_a479c9")}</a>
            ) : (
              <Link
                to="/plans"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-xs tracking-wide text-muted-foreground uppercase"
              >
                <Lock className="size-3.5" />{" "}{uiText("common:download_with_survivor_c3ca4e")}</Link>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{uiText("common:artifact_not_yet_available_3334bd")}</p>
        )}
      </div>
    </div>
  );
}

export function AchievementCard({
  achievement,
  progressPct,
}: {
  achievement: AchievementModel;
  /** Authoritative progress for unearned achievements (backend-supplied
   * only — never fabricated when absent). */
  progressPct?: number | undefined;
}) {
  useInterfaceLocale();
  return (
    <div
      className={cn(
        "panel-2 relative overflow-hidden p-4 text-center",
        !achievement.earned && "opacity-60",
      )}
    >
      <div
        className="mx-auto grid size-14 place-items-center rounded-full border"
        style={{
          borderColor: achievement.earned ? "var(--ember)" : "var(--border)",
          background: achievement.earned
            ? "color-mix(in oklab, var(--ember) 16%, transparent)"
            : "var(--surface-3)",
          boxShadow: achievement.earned ? "0 0 26px -8px var(--ember)" : undefined,
        }}
      >
        {achievement.earned ? (
          <Check className="size-6 text-primary" />
        ) : (
          <Lock className="size-5 text-muted-foreground" />
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-wide uppercase">{achievement.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>
      {!achievement.earned && progressPct !== undefined ? (
        <div className="mx-auto mt-3 max-w-48">
          <ProgressBar value={progressPct} label={uiText("common:value_progress_8196fd", { value0: uiValue(achievement.name) })} />
        </div>
      ) : null}
      <p className="mt-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {achievement.earned ? uiText("common:earned_value_f5cbb1", { value0: uiValue(achievement.earnedAt) }) : uiText("common:not_earned_bbf605")}
      </p>
    </div>
  );
}

export function CommunityPostCard({
  post,
  onUpvote,
  onReport,
  onEdit,
  onDelete,
}: {
  post: CommunityPostModel;
  onUpvote?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  useInterfaceLocale();
  return (
    <article className="panel flex gap-4 p-4 transition-colors hover:border-primary/30">
      <div className="flex w-10 shrink-0 flex-col items-center gap-1">
        {onUpvote && (
          <button
            type="button"
            aria-label={uiText("common:upvote_value_0d31f1", { value0: uiValue(post.title) })}
            onClick={onUpvote}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <ArrowBigUp className="size-5" />
          </button>
        )}
        <span className="font-mono text-xs">{post.votes}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Avatar name={post.author} size={22} />
          <span className="truncate text-foreground">{post.author}</span>
          <Chip>{post.category}</Chip>
          <span className="font-mono">{post.time}</span>
        </div>
        <Link to={`/community/posts/${post.id}`} className="mt-2 block">
          <h3 className="text-base font-semibold">{post.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        </Link>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="size-3.5" /> {post.comments}{" "}{uiText("common:comments_5b17a6")}</span>
          {onReport && (
            <button type="button" onClick={onReport} className="transition-colors hover:text-foreground">{uiText("common:report_ee45c3")}</button>
          )}
          {post.own && (
            <>
              {onEdit && (
                <button type="button" onClick={onEdit} className="transition-colors hover:text-foreground">{uiText("common:edit_530164")}</button>
              )}
              {onDelete && (
                <button type="button" onClick={onDelete} className="transition-colors hover:text-destructive">{uiText("common:delete_f6fdbe")}</button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
