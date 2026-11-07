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
import { formatAverage, formatCount, formatDurationMinutes, formatPct } from "@/lib/format/format";
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
import { useTr, type Tr } from "../i18n";

/** Matches the backend's own page default, sent explicitly so the page size
 * is a property of this view rather than of the server's config. */
const PAGE_SIZE = 25;

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

/** `formatDifficulty` falls back to "Beginner" for a code it does not know,
 * and module rows can carry "unknown" — that fallback would misreport the
 * value, so anything outside the enum is shown exactly as sent. */
const KNOWN_DIFFICULTIES: readonly string[] = ["beginner", "intermediate", "advanced"];

function difficultyLabel(value: string, { t }: Tr): string {
  return KNOWN_DIFFICULTIES.includes(value)
    ? t(`tabs.content.knownDifficulty.${value}` as "tabs.content.knownDifficulty.beginner")
    : value;
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

/** Sort vocabulary per type. The VALUES are backend contract — only the
 * labels are translated. The empty value means "omit sort" — the backend
 * then applies its own default for the type (`-users_started`, or
 * `-attempts` for quizzes).
 *
 * The dictionary mirrors this structure with a `label` per entry, so a
 * label key is checked against the same shape rather than written as a
 * dotted string here. */
type SortOption = { value: string; labelKey: string };
type SortEntry = { value: string; label: string };

const SORT_OPTIONS: Record<AdminContentType, ReadonlyArray<SortOption>> = {
  lesson: [
    { value: "", labelKey: "default" },
    { value: "-users_completed", labelKey: "mostCompleted" },
    { value: "completion_rate", labelKey: "lowestCompletion" },
    { value: "-users_stalled", labelKey: "mostStalled" },
    { value: "-estimated_minutes", labelKey: "longestEstimated" },
    { value: "title", labelKey: "title" },
  ],
  module: [
    { value: "", labelKey: "default" },
    { value: "-users_completed", labelKey: "mostCompleted" },
    { value: "completion_rate", labelKey: "lowestCompletion" },
    { value: "-quiz_attempts", labelKey: "mostAttempts" },
    { value: "quiz_pass_rate", labelKey: "lowestQuizPass" },
    { value: "title", labelKey: "title" },
  ],
  quiz: [
    { value: "", labelKey: "default" },
    { value: "-unique_users", labelKey: "mostUsers" },
    { value: "pass_rate", labelKey: "lowestPass" },
    { value: "first_attempt_pass_rate", labelKey: "lowestFirstPass" },
    { value: "avg_score", labelKey: "lowestScore" },
    { value: "title", labelKey: "title" },
  ],
};

function sortOptions({ t }: Tr): Record<AdminContentType, ReadonlyArray<SortEntry>> {
  const resolve = (type: AdminContentType) =>
    SORT_OPTIONS[type].map((option) => ({
      value: option.value,
      label: t(`tabs.content.sort.${type}.${option.labelKey}` as "tabs.content.sort.lesson.default"),
    }));
  return { lesson: resolve("lesson"), module: resolve("module"), quiz: resolve("quiz") };
}

function emptyLabel(type: AdminContentType, { t }: Tr): string {
  return type === "lesson"
    ? t("tabs.content.emptyLesson")
    : type === "module"
      ? t("tabs.content.emptyModule")
      : t("tabs.content.emptyQuiz");
}

function lessonColumns({ t }: Tr): Array<Column<AdminContentLessonRow>> {
  return [
    {
      key: "lesson",
      header: t("tabs.content.colLesson"),
      render: (row) => (
        <>
          <span className="font-medium">{row.title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.lesson_id}</span>
        </>
      ),
    },
    {
      key: "module",
      header: t("tabs.content.colModule"),
      render: (row) => (
        <>
          <span>{row.module_title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
        </>
      ),
    },
    { key: "category", header: t("tabs.content.colCategory"), render: (row) => <Num muted>{row.category}</Num> },
    {
      key: "difficulty",
      header: t("tabs.content.colDifficulty"),
      render: (row) => <Num muted>{difficultyLabel(row.difficulty, { t } as Tr)}</Num>,
    },
    {
      key: "minutes",
      header: t("tabs.content.colEstMinutes"),
      align: "right",
      render: (row) => <Num muted>{formatDurationMinutes(row.estimated_minutes)}</Num>,
    },
    {
      key: "started",
      header: t("tabs.content.colUsersStarted"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users_started)}</Num>,
    },
    {
      key: "completed",
      header: t("tabs.content.colUsersCompleted"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users_completed)}</Num>,
    },
    {
      key: "rate",
      header: t("tabs.content.colCompletionRate"),
      align: "right",
      render: (row) => <Num>{formatPct(row.completion_rate)}</Num>,
    },
    {
      key: "stalled",
      header: t("tabs.content.colUsersStalled"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users_stalled)}</Num>,
    },
    {
      key: "avg",
      header: t("tabs.content.colAvgSeconds"),
      align: "right",
      render: (row) => <MaybeNum value={row.avg_seconds_to_complete} />,
    },
    {
      key: "sample",
      header: t("tabs.content.colDurationSample"),
      align: "right",
      render: (row) => <Num muted>{formatCount(row.duration_sample)}</Num>,
    },
  ];
}

function moduleColumns({ t }: Tr): Array<Column<AdminContentModuleRow>> {
  return [
    {
      key: "module",
      header: t("tabs.content.colModule"),
      render: (row) => (
        <>
          <span className="font-medium">{row.title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
        </>
      ),
    },
    { key: "category", header: t("tabs.content.colCategory"), render: (row) => <Num muted>{row.category}</Num> },
    {
      key: "difficulty",
      header: t("tabs.content.colDifficulty"),
      render: (row) => <Num muted>{difficultyLabel(row.difficulty, { t } as Tr)}</Num>,
    },
    {
      key: "lessons",
      header: t("tabs.content.colLessons"),
      align: "right",
      render: (row) => <Num muted>{formatCount(row.lessons_count)}</Num>,
    },
    {
      key: "started",
      header: t("tabs.content.colUsersStarted"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users_started)}</Num>,
    },
    {
      key: "completed",
      header: t("tabs.content.colUsersCompleted"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users_completed)}</Num>,
    },
    {
      key: "rate",
      header: t("tabs.content.colCompletionRate"),
      align: "right",
      render: (row) => <Num>{formatPct(row.completion_rate)}</Num>,
    },
    {
      key: "attempts",
      header: t("tabs.content.colQuizAttempts"),
      align: "right",
      render: (row) => <Num>{formatCount(row.quiz_attempts)}</Num>,
    },
    {
      key: "pass_rate",
      header: t("tabs.content.colQuizPassRate"),
      align: "right",
      render: (row) => <Num>{formatPct(row.quiz_pass_rate)}</Num>,
    },
    {
      key: "avg_score",
      header: t("tabs.content.colQuizAvgScore"),
      align: "right",
      render: (row) => <MaybeNum value={row.quiz_avg_score} />,
    },
  ];
}

function quizColumns({ t }: Tr): Array<Column<AdminContentQuizRow>> {
  return [
    {
      key: "quiz",
      header: t("tabs.content.colQuiz"),
      render: (row) => (
        <>
          <span className="font-medium">{row.title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.quiz_id}</span>
        </>
      ),
    },
    {
      key: "module",
      header: t("tabs.content.colModule"),
      render: (row) => (
        <>
          <span>{row.module_title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{row.module_id}</span>
        </>
      ),
    },
    { key: "category", header: t("tabs.content.colCategory"), render: (row) => <Num muted>{row.category}</Num> },
    {
      key: "difficulty",
      header: t("tabs.content.colDifficulty"),
      render: (row) => <Num muted>{difficultyLabel(row.difficulty, { t } as Tr)}</Num>,
    },
    {
      key: "passing",
      header: t("tabs.content.colPassingScore"),
      align: "right",
      render: (row) => <Num muted>{formatAverage(row.passing_score)}</Num>,
    },
    {
      key: "users",
      header: t("tabs.content.colUniqueUsers"),
      align: "right",
      render: (row) => <Num>{formatCount(row.unique_users)}</Num>,
    },
    {
      key: "attempts",
      header: t("tabs.content.colAttempts"),
      align: "right",
      render: (row) => <Num>{formatCount(row.attempts)}</Num>,
    },
    {
      key: "pass_rate",
      header: t("tabs.content.colPassRate"),
      align: "right",
      render: (row) => <Num>{formatPct(row.pass_rate)}</Num>,
    },
    {
      key: "first_attempt",
      header: t("tabs.content.colFirstAttemptPassRate"),
      align: "right",
      render: (row) => <Num>{formatPct(row.first_attempt_pass_rate)}</Num>,
    },
    {
      key: "avg_score",
      header: t("tabs.content.colAvgScore"),
      align: "right",
      render: (row) => <Num>{formatPct(row.avg_score)}</Num>,
    },
    {
      key: "per_user",
      header: t("tabs.content.colAttemptsPerUser"),
      align: "right",
      render: (row) => <Num>{formatAverage(row.avg_attempts_per_user)}</Num>,
    },
  ];
}

export default function ContentTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t, tf } = tr;
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
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRangeContent")}</p>;
  }

  const options = sortOptions(tr);
  const pages = content.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const lastPage = pages.at(-1);
  const hasMore = lastPage?.pagination.has_more ?? false;
  const sortOption = options[type].find((option) => option.value === sort);
  const sortLabel = sortOption === undefined ? t("tabs.content.defaultOrder") : sortOption.label;

  /** Plain-language caption for the list currently being shown: what is on
   * the page, in which order, and what the search is filtering on. */
  const rowsLabel = (): string => {
    const scope =
      appliedQ === ""
        ? tf("tabs.content.rowsLabel.perPage", { pageSize: PAGE_SIZE })
        : tf("tabs.content.rowsLabel.matching", { query: appliedQ, pageSize: PAGE_SIZE });
    return `${scope} · ${sortLabel}`;
  };

  return (
    <div>
      <SectionCard
        title={t("tabs.content.title")}
        description={t("tabs.content.description")}
        action={
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <Labelled label={t("tabs.content.type")}>
              <select
                value={type}
                onChange={(event) => {
                  setType(toContentType(event.target.value));
                  // The sort vocabularies do not overlap between types.
                  setSort("");
                }}
                className={controlClass}
              >
                <option value="lesson">{t("tabs.content.typeLesson")}</option>
                <option value="module">{t("tabs.content.typeModule")}</option>
                <option value="quiz">{t("tabs.content.typeQuiz")}</option>
              </select>
            </Labelled>

            <div className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("tabs.content.searchTitle")}
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
                  aria-label={t("tabs.content.searchTitle")}
                  placeholder={t("tabs.content.searchPlaceholder")}
                  className={cn(controlClass, "w-52")}
                />
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-border bg-surface-2/70 px-3 text-[13px] text-foreground/80 transition-colors hover:bg-surface-3"
                >
                  {t("tabs.content.search")}
                </button>
              </form>
            </div>

            <Labelled label={t("tabs.content.sortBy")}>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                }}
                className={controlClass}
              >
                {options[type].map((option) => (
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
          <ErrorState
            error={content.error}
            onRetry={() => void content.refetch()}
            explain={tr.errorCopy}
            labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
          />
        ) : content.isPending ? (
          <div className="h-72 animate-pulse rounded-xl bg-surface-2" aria-hidden="true" />
        ) : (
          <>
            {lastPage !== undefined && (
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] text-muted-foreground">{rowsLabel()}</p>
                <RangeEcho from={lastPage.range.from} to={lastPage.range.to} />
              </div>
            )}

            {type === "lesson" ? (
              <DataTable
                columns={lessonColumns(tr)}
                rows={items.filter(isLessonRow)}
                getRowKey={(row) => row.id}
                caption={t("tabs.content.captionLesson")}
                emptyLabel={emptyLabel("lesson", tr)}
                minWidth={1360}
              />
            ) : type === "module" ? (
              <DataTable
                columns={moduleColumns(tr)}
                rows={items.filter(isModuleRow)}
                getRowKey={(row) => row.id}
                caption={t("tabs.content.captionModule")}
                emptyLabel={emptyLabel("module", tr)}
                minWidth={1180}
              />
            ) : (
              <DataTable
                columns={quizColumns(tr)}
                rows={items.filter(isQuizRow)}
                getRowKey={(row) => row.id}
                caption={t("tabs.content.captionQuiz")}
                emptyLabel={emptyLabel("quiz", tr)}
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
                  {content.isFetchingNextPage ? t("common.loading") : t("common.loadMore")}
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
