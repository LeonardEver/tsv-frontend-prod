/**
 * Content — per-lesson, per-module and per-quiz performance.
 *
 * `type` selects a different ROW SHAPE rather than a filter, so each type
 * gets its own table and its own sort vocabulary; switching type resets the
 * sort to the backend's default for that type. The endpoint is cursor
 * paginated, so pages are appended with "Load more" and a different type,
 * search or sort simply selects a different query.
 *
 * Two reading traps are labelled where they appear instead of being left to
 * the reader. `passing_score` is a 0–1 fraction while `avg_score` is on the
 * 0–100 quiz scale, so the two column headers state their scale and the two
 * are never rendered on a common axis. And `completion_rate` divides counts
 * that do not always agree — completions have been recorded since launch
 * while `lesson_started` began with this module — so the raw counts stay
 * beside the rate and the backend's own `notes` block (rendered below) says
 * why. `avg_seconds_to_complete` and `quiz_avg_score` are `null` when the
 * sample is empty and render as "not yet observable", never as 0.
 */
import { useState, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/components/sa/primitives";
import { queryKeys } from "@/lib/api/keys";
import {
  formatAverage,
  formatCount,
  formatDifficulty,
  formatDurationMinutes,
  formatPct,
} from "@/lib/format/format";
import type {
  AdminContentLessonRow,
  AdminContentModuleRow,
  AdminContentQuizRow,
  AdminContentRow,
  AdminContentType,
} from "@/lib/api/types";
import { fetchContent } from "../analytics.api";
import { DataTable, MaybeNum, MetricNotes, Num, RangeEcho, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";

/** Matches the backend's own page default, sent explicitly so the page size
 * is a property of this view rather than of the server's config. */
const PAGE_SIZE = 25;

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

/** `formatDifficulty` falls back to "Beginner" for a code it does not know,
 * and module rows can carry "unknown" — that fallback would misreport the
 * value, so anything outside the enum is shown exactly as sent. */
const KNOWN_DIFFICULTIES: readonly string[] = ["beginner", "intermediate", "advanced"];

function difficultyLabel(value: string): string {
  return KNOWN_DIFFICULTIES.includes(value) ? formatDifficulty(value) : value;
}

/** The three row shapes arrive in one `items` list; `type` says which is
 * present. These guards read the field only one shape declares, so each
 * table receives fully-typed rows instead of a cast. */
function isLessonRow(row: AdminContentRow): row is AdminContentLessonRow {
  return "lesson_id" in row;
}

function isModuleRow(row: AdminContentRow): row is AdminContentModuleRow {
  return "lessons_count" in row;
}

function isQuizRow(row: AdminContentRow): row is AdminContentQuizRow {
  return "quiz_id" in row;
}

function toContentType(value: string): AdminContentType {
  return value === "module" ? "module" : value === "quiz" ? "quiz" : "lesson";
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

/** Only field names these rows actually carry, with "-" for descending.
 * The empty value means "omit sort" — the backend then applies its own
 * default for the type (`-users_started`, or `-attempts` for quizzes). */
const SORT_OPTIONS: Record<AdminContentType, ReadonlyArray<{ value: string; label: string }>> = {
  lesson: [
    { value: "", label: "Most started (default)" },
    { value: "-users_completed", label: "Most completed" },
    { value: "completion_rate", label: "Lowest completion rate" },
    { value: "-users_stalled", label: "Most stalled users" },
    { value: "-estimated_minutes", label: "Longest estimated" },
    { value: "title", label: "Title (A–Z)" },
  ],
  module: [
    { value: "", label: "Most started (default)" },
    { value: "-users_completed", label: "Most completed" },
    { value: "completion_rate", label: "Lowest completion rate" },
    { value: "-quiz_attempts", label: "Most quiz attempts" },
    { value: "quiz_pass_rate", label: "Lowest quiz pass rate" },
    { value: "title", label: "Title (A–Z)" },
  ],
  quiz: [
    { value: "", label: "Most attempts (default)" },
    { value: "-unique_users", label: "Most users" },
    { value: "pass_rate", label: "Lowest pass rate" },
    { value: "first_attempt_pass_rate", label: "Lowest first-attempt pass rate" },
    { value: "avg_score", label: "Lowest average score" },
    { value: "title", label: "Title (A–Z)" },
  ],
};

const EMPTY_LABEL: Record<AdminContentType, string> = {
  lesson: "No lessons match this view.",
  module: "No modules match this view.",
  quiz: "No quizzes match this view.",
};

const LESSON_COLUMNS: Array<Column<AdminContentLessonRow>> = [
  {
    key: "lesson",
    header: "Lesson",
    render: (row) => (
      <>
        <span className="font-medium">{row.title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.lesson_id}</span>
      </>
    ),
  },
  {
    key: "module",
    header: "Module",
    render: (row) => (
      <>
        <span>{row.module_title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
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
    key: "minutes",
    header: "Est. minutes",
    align: "right",
    render: (row) => <Num muted>{formatDurationMinutes(row.estimated_minutes)}</Num>,
  },
  {
    key: "started",
    header: "Users started",
    align: "right",
    render: (row) => <Num>{formatCount(row.users_started)}</Num>,
  },
  {
    key: "completed",
    header: "Users completed",
    align: "right",
    render: (row) => <Num>{formatCount(row.users_completed)}</Num>,
  },
  {
    key: "rate",
    header: "Completion rate",
    align: "right",
    render: (row) => <Num>{formatPct(row.completion_rate)}</Num>,
  },
  {
    key: "stalled",
    header: "Users stalled",
    align: "right",
    render: (row) => <Num>{formatCount(row.users_stalled)}</Num>,
  },
  {
    key: "avg",
    header: "Avg seconds to complete",
    align: "right",
    render: (row) => <MaybeNum value={row.avg_seconds_to_complete} />,
  },
  {
    key: "sample",
    header: "Duration sample",
    align: "right",
    render: (row) => <Num muted>{formatCount(row.duration_sample)}</Num>,
  },
];

const MODULE_COLUMNS: Array<Column<AdminContentModuleRow>> = [
  {
    key: "module",
    header: "Module",
    render: (row) => (
      <>
        <span className="font-medium">{row.title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
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
    key: "lessons",
    header: "Lessons",
    align: "right",
    render: (row) => <Num muted>{formatCount(row.lessons_count)}</Num>,
  },
  {
    key: "started",
    header: "Users started",
    align: "right",
    render: (row) => <Num>{formatCount(row.users_started)}</Num>,
  },
  {
    key: "completed",
    header: "Users completed",
    align: "right",
    render: (row) => <Num>{formatCount(row.users_completed)}</Num>,
  },
  {
    key: "rate",
    header: "Completion rate",
    align: "right",
    render: (row) => <Num>{formatPct(row.completion_rate)}</Num>,
  },
  {
    key: "attempts",
    header: "Quiz attempts",
    align: "right",
    render: (row) => <Num>{formatCount(row.quiz_attempts)}</Num>,
  },
  {
    key: "pass_rate",
    header: "Quiz pass rate",
    align: "right",
    render: (row) => <Num>{formatPct(row.quiz_pass_rate)}</Num>,
  },
  {
    key: "avg_score",
    header: "Quiz avg score (0–100)",
    align: "right",
    render: (row) => <MaybeNum value={row.quiz_avg_score} />,
  },
];

const QUIZ_COLUMNS: Array<Column<AdminContentQuizRow>> = [
  {
    key: "quiz",
    header: "Quiz",
    render: (row) => (
      <>
        <span className="font-medium">{row.title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.quiz_id}</span>
      </>
    ),
  },
  {
    key: "module",
    header: "Module",
    render: (row) => (
      <>
        <span>{row.module_title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
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
    key: "passing",
    header: "Passing score (0–1)",
    align: "right",
    render: (row) => <Num muted>{formatAverage(row.passing_score)}</Num>,
  },
  {
    key: "users",
    header: "Unique users",
    align: "right",
    render: (row) => <Num>{formatCount(row.unique_users)}</Num>,
  },
  {
    key: "attempts",
    header: "Attempts",
    align: "right",
    render: (row) => <Num>{formatCount(row.attempts)}</Num>,
  },
  {
    key: "pass_rate",
    header: "Pass rate",
    align: "right",
    render: (row) => <Num>{formatPct(row.pass_rate)}</Num>,
  },
  {
    key: "first_attempt",
    header: "First-attempt pass rate",
    align: "right",
    render: (row) => <Num>{formatPct(row.first_attempt_pass_rate)}</Num>,
  },
  {
    key: "avg_score",
    header: "Avg score (0–100)",
    align: "right",
    render: (row) => <Num>{formatPct(row.avg_score)}</Num>,
  },
  {
    key: "per_user",
    header: "Attempts / user",
    align: "right",
    render: (row) => <Num>{formatAverage(row.avg_attempts_per_user)}</Num>,
  },
];

export default function ContentTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const [type, setType] = useState<AdminContentType>("lesson");
  const [draft, setDraft] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [sort, setSort] = useState("");

  const content = useInfiniteQuery({
    queryKey: queryKeys.admin.analytics("content", { ...params, type, q: appliedQ, sort, limit: PAGE_SIZE }),
    queryFn: ({ pageParam }) =>
      fetchContent({
        ...params,
        type,
        q: appliedQ === "" ? undefined : appliedQ,
        sort: sort === "" ? undefined : sort,
        limit: PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.next_cursor ?? undefined,
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return (
      <p className="panel p-6 text-sm text-muted-foreground">
        Adjust the date range above to load content performance.
      </p>
    );
  }

  const pages = content.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const lastPage = pages.at(-1);
  const hasMore = lastPage?.pagination.has_more ?? false;
  const sortOption = SORT_OPTIONS[type].find((option) => option.value === sort);
  const sortLabel = sortOption === undefined ? "backend default order" : sortOption.label;

  return (
    <div>
      <SectionCard
        title="Content performance"
        description="One row shape per type: lessons, modules and quizzes each get their own table, sort vocabulary and columns."
        action={
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <Labelled label="Type">
              <select
                value={type}
                onChange={(event) => {
                  setType(toContentType(event.target.value));
                  // The sort vocabularies do not overlap between types.
                  setSort("");
                }}
                className={controlClass}
              >
                <option value="lesson">Lessons</option>
                <option value="module">Modules</option>
                <option value="quiz">Quizzes</option>
              </select>
            </Labelled>

            <div className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Search title
              </span>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedQ(draft.trim());
                }}
              >
                <input
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                  }}
                  aria-label="Search title"
                  placeholder="Lesson or module title"
                  className={cn(controlClass, "w-52")}
                />
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-border bg-surface-2/70 px-3 text-[13px] text-foreground/80 transition-colors hover:bg-surface-3"
                >
                  Search
                </button>
              </form>
            </div>

            <Labelled label="Sort by">
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                }}
                className={controlClass}
              >
                {SORT_OPTIONS[type].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Labelled>
          </div>
        }
      >
        {content.isError ? (
          <ErrorState error={content.error} onRetry={() => void content.refetch()} />
        ) : content.isPending ? (
          <div className="h-72 animate-pulse rounded-xl bg-surface-2" aria-hidden="true" />
        ) : (
          <>
            {lastPage !== undefined && (
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] text-muted-foreground">
                  {rowsLabel(type, appliedQ, sortLabel)}
                </p>
                <RangeEcho from={lastPage.range.from} to={lastPage.range.to} />
              </div>
            )}

            {type === "lesson" ? (
              <DataTable
                columns={LESSON_COLUMNS}
                rows={items.filter(isLessonRow)}
                getRowKey={(row) => row.id}
                caption="Lesson performance in range"
                emptyLabel={EMPTY_LABEL.lesson}
                minWidth={1360}
              />
            ) : type === "module" ? (
              <DataTable
                columns={MODULE_COLUMNS}
                rows={items.filter(isModuleRow)}
                getRowKey={(row) => row.id}
                caption="Module performance in range"
                emptyLabel={EMPTY_LABEL.module}
                minWidth={1180}
              />
            ) : (
              <DataTable
                columns={QUIZ_COLUMNS}
                rows={items.filter(isQuizRow)}
                getRowKey={(row) => row.id}
                caption="Quiz performance in range"
                emptyLabel={EMPTY_LABEL.quiz}
                minWidth={1320}
              />
            )}

            {hasMore ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={content.isFetchingNextPage}
                  onClick={() => void content.fetchNextPage()}
                  className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {content.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}

            <MetricNotes notes={lastPage?.notes} />
          </>
        )}
      </SectionCard>
    </div>
  );
}

/** Plain-language caption for the list currently being shown: what is on the
 * page, in which order, and what the search is filtering on. */
function rowsLabel(type: AdminContentType, query: string, sortLabel: string): string {
  const noun = type === "lesson" ? "lessons" : type === "module" ? "modules" : "quizzes";
  const scope =
    query === "" ? `${PAGE_SIZE} ${noun} per page` : `${noun} matching "${query}", ${PAGE_SIZE} per page`;
  return `${scope} · ${sortLabel}`;
}
