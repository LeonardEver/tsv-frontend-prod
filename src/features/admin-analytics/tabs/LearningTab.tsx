/**
 * Learning — the seven activity stages and their per-plan split.
 *
 * The rule that shapes this page: the stages are NOT a nested funnel. Each
 * stage counts the distinct users who performed that action in the range,
 * so a stage is not a subset of the one above it — a user can submit a quiz
 * without ever completing a lesson, and every conversion is a ratio of two
 * populations rather than a retention of the stage above. The backend says
 * this itself in `notes.stages_are_not_nested`, which is rendered verbatim
 * beside the chart, and the stages are drawn as a flat list on one shared
 * 0–100 scale instead of as a narrowing funnel, which would imply
 * containment the numbers do not have.
 *
 * `conversion_from_previous_pct` and `drop_off_from_previous_pct` are `null`
 * on the first stage — there is no previous stage — and render as "—", never
 * as 0.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatCount, formatPct } from "@/lib/format/format";
import type {
  AdminAnalyticsNotes,
  AdminFunnelStage,
  AdminLearningPlanRow,
} from "@/lib/api/types";
import { fetchLearning } from "../analytics.api";
import { DataTable, MetricNotes, Num, RangeEcho, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";
import { useTr, type Tr } from "../i18n";

/** The seven stage codes the backend emits. An unrecognised code falls
 * back to itself with the underscores opened up, so a stage the backend
 * adds later can never render blank. */
const KNOWN_STAGES: readonly string[] = [
  "users",
  "lesson_started",
  "lesson_completed",
  "quiz_started",
  "quiz_submitted",
  "quiz_passed",
  "module_progressed",
];

function stageLabel(stage: string, { t }: Tr): string {
  return KNOWN_STAGES.includes(stage)
    ? t(`tabs.learning.stage.${stage}` as "tabs.learning.stage.users")
    : stage.replaceAll("_", " ");
}

/** One note by key, without assuming it is present. `notes` is an open
 * record, and an absent key must render nothing rather than an empty
 * caveat — the whole block is always available in `<MetricNotes>`. */
function noteText(notes: AdminAnalyticsNotes | undefined, key: string): string | undefined {
  const value = notes?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function planColumns({ t }: Tr): Array<Column<AdminLearningPlanRow>> {
  return [
    { key: "plan", header: t("tabs.learning.colPlan"), render: (row) => <Num>{row.plan}</Num> },
    {
      key: "started",
      header: t("tabs.learning.colStarted"),
      align: "right",
      render: (row) => <Num>{formatCount(row.lesson_started)}</Num>,
    },
    {
      key: "completed",
      header: t("tabs.learning.colCompleted"),
      align: "right",
      render: (row) => <Num>{formatCount(row.lesson_completed)}</Num>,
    },
  ];
}

/**
 * One row of the stage list. Every row's bar is drawn on the same 0–100
 * scale (`conversion_from_top_pct`), so the rows are comparable with each
 * other rather than reading as nested containers.
 */
function FunnelStageRow({
  stage,
  position,
  tr,
}: {
  stage: AdminFunnelStage;
  position: number;
  tr: Tr;
}) {
  const { t, tf } = tr;
  return (
    <li className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {String(position).padStart(2, "0")}
          </span>
          <span className="truncate">{stageLabel(stage.stage, tr)}</span>
        </span>
        <span className="shrink-0 font-mono text-[13px]">
          {tf("tabs.learning.usersCount", { count: formatCount(stage.users) })}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${stage.conversion_from_top_pct}%`,
            background: "var(--ember)",
            boxShadow: "0 0 12px -2px var(--ember)",
          }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 text-[11px] text-muted-foreground">
        <span>{tf("tabs.learning.ofAllUsers", { pct: formatPct(stage.conversion_from_top_pct) })}</span>
        <span className="flex gap-x-3">
          <span>
            {t("tabs.learning.fromPrevious")}{" "}
            {stage.conversion_from_previous_pct === null
              ? "—"
              : formatPct(stage.conversion_from_previous_pct)}
          </span>
          <span>
            {t("tabs.learning.dropOff")}{" "}
            {stage.drop_off_from_previous_pct === null
              ? "—"
              : formatPct(stage.drop_off_from_previous_pct)}
          </span>
        </span>
      </div>
    </li>
  );
}

export default function LearningTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t } = tr;

  const learning = useQuery({
    queryKey: queryKeys.admin.analytics("learning", params),
    queryFn: () => fetchLearning(params),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return (
      <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRangeLearning")}</p>
    );
  }

  if (learning.isError) {
    return (
      <ErrorState
        error={learning.error}
        onRetry={() => void learning.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
  }

  if (learning.isPending) {
    return (
      <div className="grid gap-4" aria-hidden="true">
        <div className="panel h-24 animate-pulse" />
        <div className="panel h-80 animate-pulse" />
      </div>
    );
  }

  const { funnel, by_plan: byPlan, notes, range } = learning.data;
  const stagesNote = noteText(notes, "stages_are_not_nested");

  return (
    <div>
      <SectionCard
        title={t("tabs.learning.stagesTitle")}
        description={t("tabs.learning.stagesDescription")}
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        {/* The backend's own statement of the non-nesting rule, placed beside
            the chart rather than left in the collapsed notes block: the
            drawing could otherwise be read as subset containment. */}
        {stagesNote !== undefined && (
          <p className="mb-5 rounded-lg border-l-2 border-[var(--warning)] bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
            <span className="mb-1 block font-mono text-[10px] tracking-[0.14em] text-[var(--warning)] uppercase">
              {t("tabs.learning.notNestedLabel")}
            </span>
            {stagesNote}
          </p>
        )}

        <ol className="grid gap-4">
          {funnel.map((stage, index) => (
            <FunnelStageRow key={stage.stage} stage={stage} position={index + 1} tr={tr} />
          ))}
        </ol>

        <MetricNotes notes={notes} />
      </SectionCard>

      <SectionCard
        title={t("tabs.learning.byPlanTitle")}
        description={t("tabs.learning.byPlanDescription")}
      >
        <DataTable
          columns={planColumns(tr)}
          rows={byPlan}
          getRowKey={(row) => row.plan}
          caption={t("tabs.learning.byPlanCaption")}
          emptyLabel={t("tabs.learning.byPlanEmpty")}
          minWidth={560}
        />
      </SectionCard>
    </div>
  );
}
