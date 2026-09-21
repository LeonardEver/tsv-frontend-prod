/**
 * Stalled — users whose recorded learning activity has gone quiet.
 *
 * This is the one endpoint in the API that returns personal data:
 * `display_name` and `email` are here because the list exists to be worked
 * as an outreach queue, and the page says so above the table. Nothing else
 * identifying is exposed anywhere on this surface.
 *
 * The rule that shapes the page is what is NOT in the list: a user who
 * registered and never learned at all is not stalled, because they never
 * activated. `thresholds.definition` and `thresholds.not_measurable` are
 * therefore rendered verbatim rather than paraphrased, next to the
 * thresholds the server actually applied. Signals are rendered from the
 * `signals` codes each row carries — none is inferred here.
 *
 * NOTE: unlike every sibling endpoint this response has no `range` key, so
 * there is nothing to echo back; the window in the filter bar is the window
 * that was requested.
 */
import { useState, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { Chip, cn } from "@/components/sa/primitives";
import { queryKeys } from "@/lib/api/keys";
import { formatCount, formatDate, formatRelativeTime } from "@/lib/format/format";
import type { AdminStalledSignal, AdminStalledUserRow } from "@/lib/api/types";
import { fetchStalledUsers } from "../analytics.api";
import { DataTable, KpiTile, Num, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";

/** Matches the backend's own page default, sent explicitly so the page size
 * is a property of this view rather than of the server's config. */
const PAGE_SIZE = 25;

/** The backend's documented range for `days_stalled`. */
const MIN_DAYS_STALLED = 1;
const MAX_DAYS_STALLED = 365;

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

/** The four signal codes the endpoint can emit, in readable form. A signal
 * appears on a row only because the backend put the code on that row. */
const SIGNAL_LABELS: Record<AdminStalledSignal, string> = {
  opened_lessons_without_completing: "opened lessons, never completed",
  inactive_over_30_days: "inactive 30+ days",
  single_session_user: "single-session user",
  quizzes_without_lesson_progress: "quizzes without lesson progress",
};

const USER_COLUMNS: Array<Column<AdminStalledUserRow>> = [
  {
    key: "user",
    header: "User",
    render: (row) => (
      <>
        <span className="font-medium">{row.display_name ?? "—"}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{row.email}</span>
      </>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    render: (row) => (
      <>
        <Num>{row.plan}</Num>
        <span className="block text-[11px] text-muted-foreground">
          {row.subscription_status ?? "—"}
        </span>
      </>
    ),
  },
  {
    key: "signed_up",
    header: "Signed up",
    align: "right",
    render: (row) => <Num muted>{formatDate(row.signed_up_at)}</Num>,
  },
  {
    key: "last_activity",
    header: "Last activity",
    align: "right",
    render: (row) => (
      <>
        <Num>{row.last_activity_at}</Num>
        <span className="block text-[11px] text-muted-foreground">{`${row.days_stalled} days stalled`}</span>
      </>
    ),
  },
  {
    key: "last_progress",
    header: "Last progress",
    align: "right",
    render: (row) => <Num muted>{formatRelativeTime(row.last_progress_at)}</Num>,
  },
  {
    key: "lessons",
    header: "Lessons",
    align: "right",
    render: (row) => <Num>{formatCount(row.lessons_completed)}</Num>,
  },
  {
    key: "quizzes",
    header: "Quiz attempts",
    align: "right",
    render: (row) => <Num>{formatCount(row.quiz_attempts)}</Num>,
  },
  {
    key: "active_days",
    header: "Active days",
    align: "right",
    render: (row) => <Num>{formatCount(row.active_days)}</Num>,
  },
  {
    key: "unanswered",
    header: "Unanswered starts",
    align: "right",
    render: (row) => <Num>{formatCount(row.unanswered_starts)}</Num>,
  },
  {
    key: "position",
    header: "Last known position",
    render: (row) => (
      <>
        <span>{row.current_lesson_title ?? "—"}</span>
        <span className="block text-[11px] text-muted-foreground">
          {row.current_module_title ?? "—"}
        </span>
      </>
    ),
  },
  {
    key: "signals",
    header: "Signals",
    render: (row) =>
      row.signals.length === 0 ? (
        <span className="text-[11px] text-muted-foreground italic">none flagged</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {row.signals.map((signal) => (
            <Chip key={signal} color="var(--warning)">
              {SIGNAL_LABELS[signal]}
            </Chip>
          ))}
        </span>
      ),
  },
];

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

export default function StalledTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const [daysStalled, setDaysStalled] = useState(14);

  const stalled = useInfiniteQuery({
    queryKey: queryKeys.admin.analytics("stalled-users", {
      ...params,
      days_stalled: daysStalled,
      limit: PAGE_SIZE,
    }),
    queryFn: ({ pageParam }) =>
      fetchStalledUsers({
        ...params,
        days_stalled: daysStalled,
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
        Adjust the date range above to load stalled users.
      </p>
    );
  }

  const pages = stalled.data?.pages ?? [];
  const users = pages.flatMap((page) => page.users);
  const lastPage = pages.at(-1);
  const hasMore = lastPage?.pagination.has_more ?? false;
  // `thresholds` is identical on every page; the first one that arrived
  // carries the values the server actually applied to this query.
  const thresholds = pages[0]?.thresholds;

  return (
    <div>
      <SectionCard
        title="Stalled users"
        description="Most-stalled first. This list is the API's only PII surface: name and email are returned so it can be worked as an outreach queue."
        action={
          <Labelled label="Days stalled">
            <input
              type="number"
              min={MIN_DAYS_STALLED}
              max={MAX_DAYS_STALLED}
              step={1}
              value={daysStalled}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) {
                  setDaysStalled(
                    Math.min(MAX_DAYS_STALLED, Math.max(MIN_DAYS_STALLED, Math.trunc(next))),
                  );
                }
              }}
              className={cn(controlClass, "w-24")}
            />
          </Labelled>
        }
      >
        {stalled.isError ? (
          <ErrorState error={stalled.error} onRetry={() => void stalled.refetch()} />
        ) : stalled.isPending ? (
          <div className="h-72 animate-pulse rounded-xl bg-surface-2" aria-hidden="true" />
        ) : (
          <>
            {thresholds !== undefined && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <KpiTile
                    label="Min days stalled"
                    value={formatCount(thresholds.min_days_stalled)}
                  />
                  <KpiTile
                    label="Min account age (days)"
                    value={formatCount(thresholds.min_account_age_days)}
                  />
                </div>

                {/* The backend's own wording for the rule, shown verbatim:
                    the numbers above mean nothing without it, and the
                    "never learned at all" exclusion is the part most likely
                    to be misread as missing data. */}
                <p className="mt-4 rounded-lg border-l-2 border-[var(--warning)] bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
                  <span className="mb-1 block font-mono text-[10px] tracking-[0.14em] text-[var(--warning)] uppercase">
                    Definition
                  </span>
                  {thresholds.definition}
                </p>

                <p className="mt-2 rounded-lg border-l-2 border-[var(--warning)] bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
                  <span className="mb-1 block font-mono text-[10px] tracking-[0.14em] text-[var(--warning)] uppercase">
                    Not measurable
                  </span>
                  {thresholds.not_measurable}
                </p>

                <p className="mt-2 text-[13px] text-muted-foreground">
                  <span className="font-mono text-[10px] tracking-[0.14em] uppercase">
                    Activity source ·{" "}
                  </span>
                  {thresholds.activity_source}
                </p>
              </>
            )}

            <div className="mt-5">
              <DataTable
                columns={USER_COLUMNS}
                rows={users}
                getRowKey={(row) => row.user_id}
                caption="Stalled users, most stalled first"
                emptyLabel="No user matches this threshold in the selected window."
                minWidth={1440}
              />
            </div>

            {hasMore ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={stalled.isFetchingNextPage}
                  onClick={() => void stalled.fetchNextPage()}
                  className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {stalled.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
