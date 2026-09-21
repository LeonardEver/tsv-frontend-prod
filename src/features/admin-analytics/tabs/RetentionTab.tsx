/**
 * Retention — signup cohorts observed on days 1, 7, 14 and 30.
 *
 * The rule that shapes this page: a cohort younger than N days reports
 * its D-N window as `null`, never as `0`. The backend is explicit that a
 * zero would read as churn rather than as missing data, so `null` renders
 * as "not yet observable" and is never coerced into a number — and the
 * cohort's `max_observable_day` sits beside it so the reason is visible.
 *
 * `definition` is the backend's own wording for what "retained" means
 * here (learning-active on exactly day N, boundaries in UTC) and is shown
 * verbatim. This endpoint returns no `notes` object.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatCount, formatPct } from "@/lib/format/format";
import type { AdminRetentionCohort, AdminRetentionWindow } from "@/lib/api/types";
import { fetchRetention } from "../analytics.api";
import { DataTable, Num, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";

const COHORT_OPTIONS: ReadonlyArray<{ value: "day" | "week" | "month"; label: string }> = [
  { value: "day", label: "Daily cohorts" },
  { value: "week", label: "Weekly cohorts" },
  { value: "month", label: "Monthly cohorts" },
];

const LIMIT_OPTIONS = [6, 12, 24, 52] as const;

const WINDOWS: ReadonlyArray<{ key: "d1" | "d7" | "d14" | "d30"; label: string }> = [
  { key: "d1", label: "D1" },
  { key: "d7", label: "D7" },
  { key: "d14", label: "D14" },
  { key: "d30", label: "D30" },
];

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

function RetentionCell({ value }: { value: AdminRetentionWindow | null }) {
  if (value === null) {
    return <span className="text-[11px] text-muted-foreground italic">not yet observable</span>;
  }
  return (
    <>
      <Num>{formatPct(value.rate, 2)}</Num>
      <span className="block text-[11px] text-muted-foreground">{formatCount(value.users)} users</span>
    </>
  );
}

const COLUMNS: Array<Column<AdminRetentionCohort>> = [
  { key: "cohort", header: "Cohort", render: (row) => <Num>{row.cohort}</Num> },
  {
    key: "size",
    header: "Size",
    align: "right",
    render: (row) => <Num>{formatCount(row.cohort_size)}</Num>,
  },
  {
    key: "observable",
    header: "Observable",
    align: "right",
    render: (row) => <Num muted>{`day ${String(row.max_observable_day)}`}</Num>,
  },
  ...WINDOWS.map(
    (window): Column<AdminRetentionCohort> => ({
      key: window.key,
      header: window.label,
      align: "right",
      render: (row) => <RetentionCell value={row[window.key]} />,
    }),
  ),
];

export default function RetentionTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const [cohort, setCohort] = useState<"day" | "week" | "month">("week");
  const [limit, setLimit] = useState<number>(24);

  const retention = useQuery({
    queryKey: queryKeys.admin.analytics("retention", { ...params, cohort, limit }),
    queryFn: () => fetchRetention({ ...params, cohort, limit }),
    enabled: !rangeRejected,
    staleTime: 5 * 60_000,
  });

  return (
    <div>
      <SectionCard
        title="Signup cohorts"
        description="Share of each signup cohort that came back to learn on day 1, 7, 14 and 30."
        action={
          <div className="flex gap-2">
            <label className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Cohort by
              </span>
              <select
                value={cohort}
                onChange={(event) => {
                  setCohort(event.target.value === "day" ? "day" : event.target.value === "month" ? "month" : "week");
                }}
                className={controlClass}
              >
                {COHORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Cohorts
              </span>
              <select
                value={String(limit)}
                onChange={(event) => { setLimit(Number(event.target.value)); }}
                className={controlClass}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {rangeRejected ? (
          <p className="text-sm text-muted-foreground">
            Adjust the date range above to load retention cohorts.
          </p>
        ) : retention.isError ? (
          <ErrorState error={retention.error} onRetry={() => void retention.refetch()} />
        ) : retention.isPending ? (
          <div className="h-56 animate-pulse rounded-xl bg-surface-2" aria-hidden="true" />
        ) : (
          <>
            <DataTable
              columns={COLUMNS}
              rows={retention.data.cohorts}
              getRowKey={(row) => row.cohort}
              caption="Retention by signup cohort"
              emptyLabel="No cohorts in this range."
              minWidth={880}
            />
            <p className="mt-4 text-[13px] text-muted-foreground">
              {retention.data.definition.activity}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {retention.data.definition.day_boundary}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {retention.data.definition.observability}
            </p>
          </>
        )}
      </SectionCard>
    </div>
  );
}
