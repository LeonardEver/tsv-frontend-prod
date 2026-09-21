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
 */
import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { cn, EmptyState } from "@/components/sa/primitives";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { isSeriesPath } from "./filters";
import { useAdminAccess } from "./use-admin-access";

const TABS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: "/admin/analytics", label: "Overview", end: true },
  { to: "/admin/analytics/users", label: "Users" },
  { to: "/admin/analytics/engagement", label: "Engagement" },
  { to: "/admin/analytics/learning", label: "Funnel" },
  { to: "/admin/analytics/content", label: "Content" },
  { to: "/admin/analytics/gaps", label: "Knowledge gaps" },
  { to: "/admin/analytics/stalled", label: "Stalled" },
  { to: "/admin/analytics/retention", label: "Retention" },
  { to: "/admin/analytics/community", label: "Community" },
  { to: "/admin/analytics/gamification", label: "Gamification" },
  { to: "/admin/analytics/billing", label: "Billing" },
  { to: "/admin/analytics/geography", label: "Geography" },
];

function AdminAnalyticsNav() {
  const { pathname, search } = useLocation();

  return (
    <nav aria-label="Analytics sections" className="mb-6 -mx-1 overflow-x-auto">
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
              {tab.label}
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

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Product analytics"
        description="Operational metrics for Survival Academy, read straight from the backend analytics API. Every figure is server-computed; definitions and known limitations are shown alongside the numbers."
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
            access.status === "unreachable" ? "Couldn't verify admin access" : "Admin access required"
          }
          description={
            access.status === "unreachable"
              ? "The analytics API couldn't be reached, so access could not be confirmed. Reload the page to try again."
              : "This surface is restricted to administrators. Your account doesn't have the admin role."
          }
        />
      )}
    </div>
  );
}
