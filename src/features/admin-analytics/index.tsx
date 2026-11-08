/**
 * Admin analytics layout — `/admin/analytics/*`.
 *
 * Access is decided by the backend, not here: every endpoint under this
 * path is gated by `[requireAuth, requireAdmin]`, and `useAdminAccess()`
 * asks the API surface whether this session passes. The layout renders
 * one of four honest states and never guesses:
 *
 *   checking     → skeleton (no flicker of content the user may not see)
 *   admin        → the dashboard
 *   denied       → "Admin access required"
 *   unreachable  → "couldn't confirm" + retry, with the dashboard hidden
 *
 * The filter bar and tab strip are shared by all twelve sections; each
 * section is its own route so only the endpoints that section needs are
 * ever requested.
 *
 * Analytics shares the application's account language and document lang.
 * Its typed dictionary adapter resolves into the global locale catalogs;
 * API diagnostic notes retain their original backend wording.
 */
import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { cn, EmptyState } from "@/components/sa/primitives";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { isSeriesPath } from "./filters";
import { useTr } from "./i18n";
import { useAdminAccess } from "./use-admin-access";

/** One per section route; the tab id doubles as its dictionary key. */
type TabId =
  | "overview"
  | "users"
  | "engagement"
  | "learning"
  | "content"
  | "gaps"
  | "stalled"
  | "retention"
  | "community"
  | "gamification"
  | "billing"
  | "geography";

const TABS: ReadonlyArray<{ to: string; id: TabId; end?: boolean }> = [
  { to: "/admin/analytics", id: "overview", end: true },
  { to: "/admin/analytics/users", id: "users" },
  { to: "/admin/analytics/engagement", id: "engagement" },
  { to: "/admin/analytics/learning", id: "learning" },
  { to: "/admin/analytics/content", id: "content" },
  { to: "/admin/analytics/gaps", id: "gaps" },
  { to: "/admin/analytics/stalled", id: "stalled" },
  { to: "/admin/analytics/retention", id: "retention" },
  { to: "/admin/analytics/community", id: "community" },
  { to: "/admin/analytics/gamification", id: "gamification" },
  { to: "/admin/analytics/billing", id: "billing" },
  { to: "/admin/analytics/geography", id: "geography" },
];

function AdminAnalyticsNav() {
  const { pathname, search } = useLocation();
  const { t } = useTr();

  return (
    <nav aria-label={t("nav.sectionsAria")} className="mb-6 -mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1 pb-1">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={{ pathname: tab.to, search }}
              end={tab.end ?? false}
              className={({ isActive }) =>
                cn(
                  "flex h-9 items-center rounded-lg border px-3 text-[13px] whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/12 font-semibold text-primary"
                    : "border-border bg-surface-2/60 text-foreground/75 hover:bg-surface-3",
                )
              }
              aria-current={pathname === tab.to ? "page" : undefined}
            >
              {t(`nav.tab.${tab.id}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AdminAnalyticsLayout() {
  const { pathname } = useLocation();
  const access = useAdminAccess();
  const { t } = useTr();

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.eyebrow")}
        title={t("nav.title")}
        description={t("nav.description")}
      />

      {access.status === "checking" ? (
        <div className="grid gap-4" aria-hidden="true">
          <div className="panel h-24 animate-pulse" />
          <div className="panel h-64 animate-pulse" />
        </div>
      ) : access.status === "admin" ? (
        <>
          <AnalyticsFilterBar series={isSeriesPath(pathname)} />
          <AdminAnalyticsNav />
          {/* Tab chunks load inside this boundary so the filter bar and
              tab strip stay mounted while a section's code arrives. */}
          <Suspense
            fallback={
              <div className="grid gap-4" aria-hidden="true">
                <div className="panel h-64 animate-pulse" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </>
      ) : (
        <EmptyState
          title={
            access.status === "unreachable" ? t("access.unreachableTitle") : t("access.deniedTitle")
          }
          description={
            access.status === "unreachable"
              ? t("access.unreachableDescription")
              : t("access.deniedDescription")
          }
        />
      )}
    </div>
  );
}
