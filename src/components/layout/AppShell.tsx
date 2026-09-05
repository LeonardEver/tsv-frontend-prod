/**
 * Application shell (Phase 23) — the Lovable reference shell
 * (`frontend-reference/.../components/layout/AppShell.tsx`) is the visual
 * source of truth: desktop sidebar (Primary / Regions / Account), top
 * utility bar, mobile drawer, mobile bottom navigation, `topo` + `grain`
 * environment.
 *
 * Everything is wired to the REAL backend: regions come from /categories,
 * XP/level from the canonical gamification query, identity from /auth/me.
 * Navigation targets the existing production route contracts.
 */
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  BookOpen,
  TrendingUp,
  Trophy,
  Users,
  User,
  CreditCard,
  Search,
  Bell,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { cn, LevelBadge, XPBadge } from "@/components/sa/primitives";
import { BrandMark } from "./BrandMark";
import { catColorForCode } from "@/lib/category-visuals";
import { queryKeys } from "@/lib/api/keys";
import { useAuth } from "@/features/auth/auth-context";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { SkipLink } from "./SkipLink";
import { OfflineBanner } from "./OfflineBanner";
import { ToastHost } from "./ToastHost";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

/** VISUAL — application shell. Navigation only; no business logic. */

const primary = [
  { to: "/", label: "Base Camp", icon: Home },
  { to: "/categories", label: "Learn", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/gamification", label: "Rewards", icon: Trophy },
  { to: "/community", label: "Community", icon: Users },
] as const;

const account = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/plans", label: "Plans", icon: CreditCard },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
        active
          ? "bg-primary/12 font-semibold text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {active && (
        <span className="ml-auto h-4 w-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--ember)]" />
      )}
    </Link>
  );
}

function SidebarRegions({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const { status } = useAuth();
  const authed = status === "authenticated";
  const categories = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    enabled: authed,
  });

  const rows = categories.data?.categories ?? [];

  return (
    <div>
      <p className="eyebrow px-3 pb-2">Regions</p>
      <nav aria-label="Regions" className="grid gap-0.5">
        {!authed || categories.isPending
          ? Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="mx-3 mb-0.5 block h-6 animate-pulse rounded-md bg-sidebar-accent" />
            ))
          : rows.map((c) => {
              const active = pathname.startsWith(`/categories/${c.slug}`);
              return (
                <Link
                  key={c.slug}
                  to={`/categories/${c.slug}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      background: catColorForCode(c.code),
                      boxShadow: `0 0 8px ${catColorForCode(c.code)}`,
                    }}
                  />
                  <span className="truncate">{c.title}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {c.completed_count}/{c.module_count}
                  </span>
                </Link>
              );
            })}
      </nav>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link to="/" className="px-2" onClick={onNavigate}>
        <BrandMark />
      </Link>

      <nav aria-label="Primary" className="grid gap-1">
        {primary.map((i) => (
          <NavItem
            key={i.to}
            {...i}
            active={i.to === "/" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(i.to)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <SidebarRegions pathname={pathname} onNavigate={onNavigate} />

      <div className="mt-auto">
        <p className="eyebrow px-3 pb-2">Account</p>
        <nav aria-label="Account" className="grid gap-1">
          {account.map((i) => (
            <NavItem
              key={i.to}
              {...i}
              active={pathname.startsWith(i.to)}
              onNavigate={onNavigate}
            />
          ))}
          <button
            type="button"
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <Settings className="size-4" /> Settings
          </button>
        </nav>
      </div>
    </div>
  );
}

/** XP / level readout — canonical gamification query (the SAME cache
 * entry the dashboard and /gamification consume). */
function useShellGamification() {
  const { status } = useAuth();
  const authed = status === "authenticated";
  return useQuery({
    queryKey: queryKeys.gamification.summary,
    queryFn: fetchGamificationSummary,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: authed,
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  useOnlineStatus();
  const { pathname } = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const gamification = useShellGamification();

  const summary = gamification.data;

  return (
    <div className="topo grain relative min-h-screen">
      <SkipLink />
      <div className="relative flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-sm lg:block">
          <SidebarContent pathname={pathname} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top utility bar */}
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  aria-label="Open navigation"
                  onClick={() => { setMobileNav(true); }}
                  className="grid size-10 place-items-center rounded-lg border border-border"
                >
                  <Menu className="size-5" />
                </button>
                <Link to="/">
                  <BrandMark compact />
                </Link>
              </div>

              <div className="hidden min-w-0 lg:block">
                <label className="relative block max-w-md">
                  <span className="sr-only">Search lessons, missions, resources</span>
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search missions, field manuals, resources…"
                    className="h-10 w-full rounded-lg border border-border bg-surface-2/70 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>
              </div>
              <div className="lg:hidden" />

              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <div className="hidden items-center gap-2 sm:flex">
                  {summary ? (
                    <>
                      <XPBadge xp={summary.total_xp} />
                      <LevelBadge level={summary.level} title={summary.level_title} />
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-6 w-20 animate-pulse items-center rounded-full border border-primary/40 bg-primary/10" />
                      <span className="inline-flex h-6 w-24 animate-pulse items-center rounded-full border border-border bg-surface-2" />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Bell className="size-4" />
                  <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
                </button>
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
            <div className="px-4 pb-2 sm:hidden">
              <div className="flex items-center gap-2">
                {summary ? (
                  <>
                    <XPBadge xp={summary.total_xp} />
                    <LevelBadge level={summary.level} />
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {summary.xp_to_next_level} XP to LVL {summary.level + 1}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </header>

          <OfflineBanner />

          <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-14">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => { setMobileNav(false); }}
          />
          <div className="absolute inset-y-0 left-0 w-[80%] max-w-72 border-r border-sidebar-border bg-sidebar">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => { setMobileNav(false); }}
              className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg border border-border"
            >
              <X className="size-4" />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => { setMobileNav(false); }} />
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {[
            { to: "/", label: "Home", icon: Home },
            { to: "/categories", label: "Learn", icon: BookOpen },
            { to: "/community", label: "Community", icon: Users },
            { to: "/progress", label: "Progress", icon: TrendingUp },
            { to: "/profile", label: "Profile", icon: User },
          ].map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] tracking-wide uppercase",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ToastHost />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string | undefined;
  aside?: ReactNode;
}) {
  return (
    <header className="rise mb-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-1.5 font-display text-3xl leading-none font-semibold tracking-wide uppercase sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {aside}
    </header>
  );
}
