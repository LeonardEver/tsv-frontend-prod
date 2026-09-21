/**
 * Geography — where users said they are, with the missing share stated.
 *
 * The rule that shapes this page: `users.country` is nullable and not
 * required at signup, so the endpoint reports coverage as its own triple
 * rather than hiding the gap. A coverage below 100% means the remaining
 * users never declared a country — unknown, not zero — and every
 * percentage in the country rows is of users WITH a country, so those
 * users sit outside the denominator rather than diluting it.
 *
 * Country is a profile attribute, not a connection property: it reflects
 * what the user declared, not where they connected from. The backend's own
 * wording for that — and for how the column is validated on write — is
 * rendered verbatim in the notes below.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import type { AdminGeographyCountryRow } from "@/lib/api/types";
import { formatCount, formatPct } from "@/lib/format/format";
import { COUNTRIES } from "@/lib/geo/countries";
import { fetchGeography } from "../analytics.api";
import {
  BarSeries,
  DataTable,
  KpiTile,
  MaybeNum,
  MetricNotes,
  Num,
  RangeEcho,
  SectionCard,
  type Column,
} from "../charts";
import { useAnalyticsFilters } from "../filters";

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

/** ISO alpha-2 → display name; the raw stored code when the list is
 * silent (the column is validated on write, so this is a fallback, not
 * an expected case). */
function countryLabel(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

const COLUMNS: Array<Column<AdminGeographyCountryRow>> = [
  {
    key: "country",
    header: "Country",
    render: (row) => (
      <>
        <span>{countryLabel(row.country)}</span>
        <span className="block">
          <Num muted>{row.country}</Num>
        </span>
      </>
    ),
  },
  { key: "users", header: "Users", align: "right", render: (row) => <MaybeNum value={row.users} /> },
  {
    key: "share",
    header: "Share",
    align: "right",
    render: (row) => <MaybeNum value={row.percentage_of_users} format={formatPct} />,
  },
  {
    key: "active",
    header: "Active users",
    align: "right",
    render: (row) => <MaybeNum value={row.active_users} />,
  },
  {
    key: "active_rate",
    header: "Active rate",
    align: "right",
    render: (row) => <MaybeNum value={row.active_rate} format={formatPct} />,
  },
  {
    key: "paying",
    header: "Paying users",
    align: "right",
    render: (row) => <MaybeNum value={row.paying_users} />,
  },
  {
    key: "paying_rate",
    header: "Paying rate",
    align: "right",
    render: (row) => <MaybeNum value={row.paying_rate} format={formatPct} />,
  },
  {
    key: "trial",
    header: "Trial users",
    align: "right",
    render: (row) => <MaybeNum value={row.trial_users} />,
  },
];

export default function GeographyTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const [limit, setLimit] = useState<number>(50);

  const geography = useQuery({
    queryKey: queryKeys.admin.analytics("geography", { ...params, limit }),
    queryFn: () => fetchGeography({ ...params, limit }),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return (
      <p className="panel p-6 text-sm text-muted-foreground">
        Adjust the date range above to load these metrics.
      </p>
    );
  }

  if (geography.isError) {
    return <ErrorState error={geography.error} onRetry={() => void geography.refetch()} />;
  }

  if (geography.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="panel-2 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const { range, totals, countries, notes } = geography.data;

  return (
    <div>
      <SectionCard
        title="Coverage"
        description="Country is the value a user declared on their profile, validated as an ISO code on write — not where they connected from."
        action={
          <div className="flex items-end gap-3">
            <label className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Countries
              </span>
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
            </label>
            <RangeEcho from={range.from} to={range.to} />
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label="Users with a country"
            value={formatCount(totals.users_with_country)}
            hint="Declared on their profile"
          />
          <KpiTile
            label="Users without a country"
            value={formatCount(totals.users_without_country)}
            hint="Not required at signup"
          />
          <KpiTile
            label="Coverage"
            value={formatPct(totals.coverage_pct)}
            hint="Share of users with a country"
          />
        </div>
        {/* The gap is stated rather than implied: coverage below 100% is
            missing declaration, and the country percentages below are of
            the users who declared — not of the whole base. */}
        <p className="mt-4 rounded-lg border-l-2 border-[var(--cat-navigation)] bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
          Coverage below 100% means the remaining users have no country on file — unknown, not
          zero. Every percentage in the table below is of users WITH a country, so those users sit
          outside the denominator.
        </p>
      </SectionCard>

      <SectionCard
        title="Users by country"
        description="The returned rows in rank order — one bar per country, the same order the table below uses."
      >
        <BarSeries
          data={countries}
          valueOf={(row) => row.users}
          labelOf={(row) => countryLabel(row.country)}
          ariaLabel="Users by country"
          color="var(--cat-navigation)"
        />
      </SectionCard>

      <SectionCard
        title="Country breakdown"
        description="One row per returned country, ranked by users and capped at the row limit selected above. Share is of users WITH a country, and the active, paying and trial columns are subsets of that country's users."
      >
        <DataTable
          columns={COLUMNS}
          rows={countries}
          getRowKey={(row) => row.country}
          caption="Users, activity and paying rate by country"
          emptyLabel="No country rows in this range."
          minWidth={1000}
        />
      </SectionCard>

      <div className="panel p-5">
        <MetricNotes notes={notes} />
      </div>
    </div>
  );
}
