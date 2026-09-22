/**
 * Knowledge gaps — the weakest learning objectives, questions and knowledge
 * items in the selected window.
 *
 * The backend returns every list already sorted worst-accuracy-first, and
 * applies a sample floor before sending anything: only rows with at least
 * `min_sample` answers in range appear, which is what keeps a single wrong
 * answer from topping the list. The floor in effect is echoed back on the
 * response, shown next to the control, and the backend's own note below
 * states the rule in its own words.
 *
 * `accuracy` is a 0–100 percentage and is rendered with `formatPct`. Its
 * attribution caveat (a question mapped to several objectives counts for
 * each of them) comes from the backend's `notes`, not from this file.
 */
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/components/sa/primitives";
import { queryKeys } from "@/lib/api/keys";
import { formatCount, formatPct } from "@/lib/format/format";
import type {
  AdminWeakKnowledgeItemRow,
  AdminWeakObjectiveRow,
  AdminWeakQuestionRow,
} from "@/lib/api/types";
import { fetchKnowledgeGaps } from "../analytics.api";
import { DataTable, MetricNotes, Num, RangeEcho, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";
import { useTr, type Tr } from "../i18n";

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

/** The difficulty enum, in display form; a code outside it (module rows can
 * carry "unknown") is shown exactly as sent rather than approximated. */
const KNOWN_DIFFICULTIES: readonly string[] = ["beginner", "intermediate", "advanced"];

function difficultyLabel(value: string, { t }: Tr): string {
  return KNOWN_DIFFICULTIES.includes(value)
    ? t(`tabs.content.knownDifficulty.${value}` as "tabs.content.knownDifficulty.beginner")
    : value;
}

/** Local twin of the filter bar's private control shell. */
function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function objectiveColumns({ t }: Tr): Array<Column<AdminWeakObjectiveRow>> {
  return [
    {
      key: "objective",
      header: t("tabs.gaps.colObjective"),
      render: (row) => (
        <>
          <span className="font-medium">{row.lo_label}</span>
          <span className="block max-w-[26rem] truncate text-[11px] text-muted-foreground">
            {row.description}
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.lo_global_id}</span>
        </>
      ),
    },
    {
      key: "where",
      header: t("tabs.gaps.colTaughtIn"),
      render: (row) => (
        <>
          <span>{row.lesson_title}</span>
          <span className="block text-[11px] text-muted-foreground">{row.module_title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.lesson_id}</span>
        </>
      ),
    },
    { key: "category", header: t("tabs.gaps.colCategory"), render: (row) => <Num muted>{row.category}</Num> },
    {
      key: "attempts",
      header: t("tabs.gaps.colAnswers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.attempts)}</Num>,
    },
    {
      key: "correct",
      header: t("tabs.gaps.colCorrect"),
      align: "right",
      render: (row) => <Num>{formatCount(row.correct)}</Num>,
    },
    {
      key: "accuracy",
      header: t("tabs.gaps.colAccuracy"),
      align: "right",
      render: (row) => <Num>{formatPct(row.accuracy)}</Num>,
    },
    {
      key: "users",
      header: t("tabs.gaps.colUsers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users)}</Num>,
    },
  ];
}

function questionColumns(tr: Tr): Array<Column<AdminWeakQuestionRow>> {
  const { t } = tr;
  return [
    {
      key: "question",
      header: t("tabs.gaps.colQuestion"),
      render: (row) => (
        <>
          <span className="font-medium">{row.question_text}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.question_id}</span>
        </>
      ),
    },
    {
      key: "difficulty",
      header: t("tabs.gaps.colDifficulty"),
      render: (row) => <Num muted>{difficultyLabel(row.difficulty, tr)}</Num>,
    },
    {
      key: "quiz",
      header: t("tabs.gaps.colAskedIn"),
      render: (row) => (
        <>
          <span>{row.quiz_title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.quiz_id}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
        </>
      ),
    },
    {
      key: "attempts",
      header: t("tabs.gaps.colAnswers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.attempts)}</Num>,
    },
    {
      key: "correct",
      header: t("tabs.gaps.colCorrect"),
      align: "right",
      render: (row) => <Num>{formatCount(row.correct)}</Num>,
    },
    {
      key: "accuracy",
      header: t("tabs.gaps.colAccuracy"),
      align: "right",
      render: (row) => <Num>{formatPct(row.accuracy)}</Num>,
    },
    {
      key: "users",
      header: t("tabs.gaps.colUsers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users)}</Num>,
    },
  ];
}

function knowledgeColumns(tr: Tr): Array<Column<AdminWeakKnowledgeItemRow>> {
  const { t } = tr;
  return [
    {
      key: "item",
      header: t("tabs.gaps.colKnowledgeItem"),
      render: (row) => (
        <>
          <span className="font-medium">{row.title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.knowledge_id}</span>
        </>
      ),
    },
    { key: "category", header: t("tabs.gaps.colCategory"), render: (row) => <Num muted>{row.category}</Num> },
    {
      key: "difficulty",
      header: t("tabs.gaps.colDifficulty"),
      render: (row) => <Num muted>{difficultyLabel(row.difficulty, tr)}</Num>,
    },
    {
      key: "attempts",
      header: t("tabs.gaps.colAnswers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.attempts)}</Num>,
    },
    {
      key: "correct",
      header: t("tabs.gaps.colCorrect"),
      align: "right",
      render: (row) => <Num>{formatCount(row.correct)}</Num>,
    },
    {
      key: "accuracy",
      header: t("tabs.gaps.colAccuracy"),
      align: "right",
      render: (row) => <Num>{formatPct(row.accuracy)}</Num>,
    },
    {
      key: "users",
      header: t("tabs.gaps.colUsers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users)}</Num>,
    },
  ];
}

export default function GapsTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t, tf } = tr;
  const [minSample, setMinSample] = useState(5);
  const [limit, setLimit] = useState(25);

  const gaps = useQuery({
    queryKey: queryKeys.admin.analytics("knowledge-gaps", { ...params, min_sample: minSample, limit }),
    queryFn: () => fetchKnowledgeGaps({ ...params, min_sample: minSample, limit }),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRangeGaps")}</p>;
  }

  if (gaps.isError) {
    return (
      <ErrorState
        error={gaps.error}
        onRetry={() => void gaps.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
  }

  if (gaps.isPending) {
    return (
      <div className="grid gap-4" aria-hidden="true">
        <div className="panel h-24 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
      </div>
    );
  }

  const {
    weakest_objectives: objectives,
    weakest_questions: questions,
    weakest_knowledge_items: items,
    min_sample: resolvedMinSample,
    notes,
    range,
  } = gaps.data;

  return (
    <div>
      <SectionCard
        title={t("tabs.gaps.weakestObjectivesTitle")}
        description={t("tabs.gaps.lowestAccuracyFirst")}
        action={
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <Labelled label={t("tabs.gaps.minAnswers")}>
              <input
                type="number"
                min={1}
                step={1}
                value={minSample}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next) && next >= 1) setMinSample(Math.trunc(next));
                }}
                className={cn(controlClass, "w-24")}
              />
            </Labelled>

            <Labelled label={t("tabs.gaps.rowsPerList")}>
              <select
                value={String(limit)}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                }}
                className={controlClass}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Labelled>

            <RangeEcho from={range.from} to={range.to} />
          </div>
        }
      >
        {/* The floor the server actually applied, echoed back on the response
            rather than assumed from the control. */}
        <p className="mb-3 text-[13px] text-muted-foreground">
          {tf("tabs.gaps.floorInEffect", { floor: formatCount(resolvedMinSample) })}
        </p>

        <DataTable
          columns={objectiveColumns(tr)}
          rows={objectives}
          getRowKey={(row) => `${row.lo_id}-${row.lesson_id}`}
          caption={t("tabs.gaps.objectivesCaption")}
          emptyLabel={t("tabs.gaps.objectivesEmpty")}
          minWidth={1080}
        />
      </SectionCard>

      <SectionCard
        title={t("tabs.gaps.weakestQuestionsTitle")}
        description={t("tabs.gaps.lowestAccuracyFirst")}
      >
        <DataTable
          columns={questionColumns(tr)}
          rows={questions}
          getRowKey={(row) => row.question_db_id}
          caption={t("tabs.gaps.questionsCaption")}
          emptyLabel={t("tabs.gaps.questionsEmpty")}
          minWidth={1040}
        />
      </SectionCard>

      <SectionCard
        title={t("tabs.gaps.weakestItemsTitle")}
        description={t("tabs.gaps.lowestAccuracyFirst")}
      >
        <DataTable
          columns={knowledgeColumns(tr)}
          rows={items}
          getRowKey={(row) => row.knowledge_db_id}
          caption={t("tabs.gaps.itemsCaption")}
          emptyLabel={t("tabs.gaps.itemsEmpty")}
          minWidth={900}
        />

        <MetricNotes notes={notes} />
      </SectionCard>
    </div>
  );
}
