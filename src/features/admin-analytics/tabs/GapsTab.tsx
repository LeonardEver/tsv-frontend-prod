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
import { formatCount, formatDifficulty, formatPct } from "@/lib/format/format";
import type {
  AdminWeakKnowledgeItemRow,
  AdminWeakObjectiveRow,
  AdminWeakQuestionRow,
} from "@/lib/api/types";
import { fetchKnowledgeGaps } from "../analytics.api";
import { DataTable, MetricNotes, Num, RangeEcho, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

/** `formatDifficulty` falls back to "Beginner" for a code it does not know;
 * that fallback would misreport the value, so anything outside the enum is
 * shown exactly as sent. */
const KNOWN_DIFFICULTIES: readonly string[] = ["beginner", "intermediate", "advanced"];

function difficultyLabel(value: string): string {
  return KNOWN_DIFFICULTIES.includes(value) ? formatDifficulty(value) : value;
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

const OBJECTIVE_COLUMNS: Array<Column<AdminWeakObjectiveRow>> = [
  {
    key: "objective",
    header: "Learning objective",
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
    header: "Taught in",
    render: (row) => (
      <>
        <span>{row.lesson_title}</span>
        <span className="block text-[11px] text-muted-foreground">{row.module_title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.lesson_id}</span>
      </>
    ),
  },
  { key: "category", header: "Category", render: (row) => <Num muted>{row.category}</Num> },
  {
    key: "attempts",
    header: "Answers",
    align: "right",
    render: (row) => <Num>{formatCount(row.attempts)}</Num>,
  },
  {
    key: "correct",
    header: "Correct",
    align: "right",
    render: (row) => <Num>{formatCount(row.correct)}</Num>,
  },
  {
    key: "accuracy",
    header: "Accuracy",
    align: "right",
    render: (row) => <Num>{formatPct(row.accuracy)}</Num>,
  },
  {
    key: "users",
    header: "Users",
    align: "right",
    render: (row) => <Num>{formatCount(row.users)}</Num>,
  },
];

const QUESTION_COLUMNS: Array<Column<AdminWeakQuestionRow>> = [
  {
    key: "question",
    header: "Question",
    render: (row) => (
      <>
        <span className="font-medium">{row.question_text}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.question_id}</span>
      </>
    ),
  },
  {
    key: "difficulty",
    header: "Difficulty",
    render: (row) => <Num muted>{difficultyLabel(row.difficulty)}</Num>,
  },
  {
    key: "quiz",
    header: "Asked in",
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
    header: "Answers",
    align: "right",
    render: (row) => <Num>{formatCount(row.attempts)}</Num>,
  },
  {
    key: "correct",
    header: "Correct",
    align: "right",
    render: (row) => <Num>{formatCount(row.correct)}</Num>,
  },
  {
    key: "accuracy",
    header: "Accuracy",
    align: "right",
    render: (row) => <Num>{formatPct(row.accuracy)}</Num>,
  },
  {
    key: "users",
    header: "Users",
    align: "right",
    render: (row) => <Num>{formatCount(row.users)}</Num>,
  },
];

const KNOWLEDGE_COLUMNS: Array<Column<AdminWeakKnowledgeItemRow>> = [
  {
    key: "item",
    header: "Knowledge item",
    render: (row) => (
      <>
        <span className="font-medium">{row.title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.knowledge_id}</span>
      </>
    ),
  },
  { key: "category", header: "Category", render: (row) => <Num muted>{row.category}</Num> },
  {
    key: "difficulty",
    header: "Difficulty",
    render: (row) => <Num muted>{difficultyLabel(row.difficulty)}</Num>,
  },
  {
    key: "attempts",
    header: "Answers",
    align: "right",
    render: (row) => <Num>{formatCount(row.attempts)}</Num>,
  },
  {
    key: "correct",
    header: "Correct",
    align: "right",
    render: (row) => <Num>{formatCount(row.correct)}</Num>,
  },
  {
    key: "accuracy",
    header: "Accuracy",
    align: "right",
    render: (row) => <Num>{formatPct(row.accuracy)}</Num>,
  },
  {
    key: "users",
    header: "Users",
    align: "right",
    render: (row) => <Num>{formatCount(row.users)}</Num>,
  },
];

export default function GapsTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const [minSample, setMinSample] = useState(5);
  const [limit, setLimit] = useState(25);

  const gaps = useQuery({
    queryKey: queryKeys.admin.analytics("knowledge-gaps", { ...params, min_sample: minSample, limit }),
    queryFn: () => fetchKnowledgeGaps({ ...params, min_sample: minSample, limit }),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return (
      <p className="panel p-6 text-sm text-muted-foreground">
        Adjust the date range above to load the knowledge gaps.
      </p>
    );
  }

  if (gaps.isError) {
    return <ErrorState error={gaps.error} onRetry={() => void gaps.refetch()} />;
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
        title="Weakest objectives"
        description="Lowest accuracy first, exactly as the backend orders them."
        action={
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <Labelled label="Min answers">
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

            <Labelled label="Rows per list">
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
          Floor in effect: {formatCount(resolvedMinSample)} answers per row.
        </p>

        <DataTable
          columns={OBJECTIVE_COLUMNS}
          rows={objectives}
          getRowKey={(row) => `${row.lo_id}-${row.lesson_id}`}
          caption="Weakest learning objectives by accuracy"
          emptyLabel="No objective clears the sample floor in this range."
          minWidth={1080}
        />
      </SectionCard>

      <SectionCard
        title="Weakest questions"
        description="Lowest accuracy first, exactly as the backend orders them."
      >
        <DataTable
          columns={QUESTION_COLUMNS}
          rows={questions}
          getRowKey={(row) => row.question_db_id}
          caption="Weakest quiz questions by accuracy"
          emptyLabel="No question clears the sample floor in this range."
          minWidth={1040}
        />
      </SectionCard>

      <SectionCard
        title="Weakest knowledge items"
        description="Lowest accuracy first, exactly as the backend orders them."
      >
        <DataTable
          columns={KNOWLEDGE_COLUMNS}
          rows={items}
          getRowKey={(row) => row.knowledge_db_id}
          caption="Weakest knowledge items by accuracy"
          emptyLabel="No knowledge item clears the sample floor in this range."
          minWidth={900}
        />

        <MetricNotes notes={notes} />
      </SectionCard>
    </div>
  );
}
