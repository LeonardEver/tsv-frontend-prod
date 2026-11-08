import { rankTitle } from "@/features/gamification/rewards-presenter";
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
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
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
  BarChart3,
  Search,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { cn, LevelBadge, XPBadge } from "@/components/sa/primitives";
import { BrandMark } from "./BrandMark";
import { catColorForCode } from "@/lib/category-visuals";
import { queryKeys } from "@/lib/api/keys";
import { useAuth } from "@/features/auth/auth-context";
import { useAdminAccess } from "@/features/admin-analytics/use-admin-access";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { SkipLink } from "./SkipLink";
import { OfflineBanner } from "./OfflineBanner";
import { ToastHost } from "./ToastHost";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
// Imported from its own module rather than the feature barrel: the barrel
// re-exports the lazily-routed Simplified screens, and pulling it in here
// would drag all three into the main chunk.
import { ModeSwitch } from "@/features/simplified/ModeSwitch";
import styles from "./app-shell.module.css";

/** VISUAL — application shell. Navigation only; no business logic. */

const primary = [
  { to: "/", get label() { return uiText("navigation:base_camp_8e2aa8"); }, icon: Home },
  { to: "/categories", get label() { return uiText("navigation:learn_b04837"); }, icon: BookOpen },
  { to: "/progress", get label() { return uiText("navigation:progress_1b9027"); }, icon: TrendingUp },
  { to: "/gamification", get label() { return uiText("navigation:rewards_2f4f4b"); }, icon: Trophy },
  { to: "/community", get label() { return uiText("navigation:community_bfd58e"); }, icon: Users },
] as const;

const account = [
  { to: "/profile", get label() { return uiText("navigation:profile_ff4fc0"); }, icon: User },
  { to: "/plans", get label() { return uiText("navigation:plans_cf2e5f"); }, icon: CreditCard },
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
  useInterfaceLocale();
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
  useInterfaceLocale();
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
      <p className="eyebrow px-3 pb-2">{uiText("navigation:regions_039711")}</p>
      <nav aria-label={uiText("navigation:regions_039711")} className="grid gap-0.5">
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
  useInterfaceLocale();
  // Admin capability is decided by the backend (see use-admin-access);
  // until it confirms, the entry stays hidden rather than flickering in.
  const { isAdmin } = useAdminAccess();

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link to="/" className="px-2" onClick={onNavigate}>
        <BrandMark />
      </Link>

      <nav aria-label={uiText("navigation:primary_a9a96e")} className="grid gap-1">
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
        <p className="eyebrow px-3 pb-2">{uiText("navigation:account_85dfa3")}</p>
        <nav aria-label={uiText("navigation:account_85dfa3")} className="grid gap-1">
          {account.map((i) => (
            <NavItem
              key={i.to}
              {...i}
              active={pathname.startsWith(i.to)}
              onNavigate={onNavigate}
            />
          ))}
          {isAdmin && (
            <NavItem
              to="/admin/analytics"
              label={uiText("navigation:analytics_25bc96")}
              icon={BarChart3}
              active={pathname.startsWith("/admin/analytics")}
              onNavigate={onNavigate}
            />
          )}
          <button
            type="button"
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <Settings className="size-4" />{" "}{uiText("navigation:settings_c7f73b")}</button>
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
  useInterfaceLocale();
  useOnlineStatus();
  const { pathname } = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const gamification = useShellGamification();

  const summary = gamification.data;
  const focusedQuiz = /^\/modules\/[^/]+\/quiz(?:\/|$)/.test(pathname);

  return (
    <div className={cn("topo grain relative min-h-dvh", styles.shell, focusedQuiz && styles.focusedQuiz)}>
      <SkipLink />
      <div className="relative flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside className={cn("sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-sm lg:block", styles.sidebarScenery)}>
          <SidebarContent pathname={pathname} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top utility bar. The safe-area inset is padding rather than
              margin so the blurred background still fills the notch. */}
          <header
            className={cn("sticky top-0 z-[var(--z-chrome)] border-b border-border bg-background/80 backdrop-blur-md", styles.utilityBar)}
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className={styles.toolbar}>
              <div className={`flex items-center gap-2 lg:hidden ${styles.mobileIdentity}`}>
                <button
                  type="button"
                  aria-label={uiText("navigation:open_navigation_0f53b3")}
                  onClick={() => { setMobileNav(true); }}
                  className="grid size-10 place-items-center rounded-lg border border-border"
                >
                  <Menu className="size-5" />
                </button>
                <Link to="/">
                  <BrandMark className={styles.mobileBrand} />
                </Link>
              </div>

              <div className={`hidden min-w-0 lg:block ${styles.search}`}>
                <label className="relative block max-w-md">
                  <span className="sr-only">{uiText("navigation:search_lessons_missions_resources_75b249")}</span>
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder={uiText("navigation:search_missions_field_manuals_resources_01aad1")}
                    className="h-10 w-full rounded-lg border border-border bg-surface-2/70 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>
              </div>
                <div className={styles.statusControls} title={summary ? summary.xp_to_next_level === null ? uiText("navigation:max_level_reached_c28dc6") : uiText("navigation:value_xp_to_lvl_value_082826", { value0: uiValue(summary.xp_to_next_level), value1: uiValue(summary.level + 1) }) : undefined}>
                  {summary ? (
                    <>
                      <XPBadge xp={summary.total_xp} />
                      <LevelBadge level={summary.level} title={rankTitle(summary.level, summary.level_title)} />
                      <span className="sr-only">{summary.xp_to_next_level === null ? uiText("navigation:max_level_reached_c28dc6") : uiText("navigation:value_xp_to_lvl_value_082826", { value0: uiValue(summary.xp_to_next_level), value1: uiValue(summary.level + 1) })}</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-6 w-20 animate-pulse items-center rounded-full border border-primary/40 bg-primary/10" />
                      <span className="inline-flex h-6 w-24 animate-pulse items-center rounded-full border border-border bg-surface-2" />
                    </>
                  )}
                </div>
                <div className={styles.modeControls}><ModeSwitch compact /></div>
              <div className={cn("flex items-center justify-end gap-2 sm:gap-3", styles.utilities)}>
                <NotificationCenter />
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </header>

          <OfflineBanner />

          <main id="main" className={cn("min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-14", styles.main)}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
          <button
            type="button"
            aria-label={uiText("navigation:close_navigation_917c4c")}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => { setMobileNav(false); }}
          />
          <div
            className={cn("absolute inset-y-0 left-0 w-[80%] max-w-72 border-r border-sidebar-border bg-sidebar shadow-[var(--shadow-elevated)]", styles.sidebarScenery)}
            style={{
              // Keep the drawer's own content clear of the notch and the
              // home indicator; the brand block sits at the very top.
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <button
              type="button"
              aria-label={uiText("navigation:close_navigation_917c4c")}
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
        aria-label={uiText("navigation:primary_mobile_f455b6")}
        className={cn("fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-border bg-background/95 backdrop-blur-md lg:hidden", styles.bottomNav)}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {[
            { to: "/", get label() { return uiText("navigation:home_70f8bb"); }, icon: Home },
            { to: "/categories", get label() { return uiText("navigation:learn_b04837"); }, icon: BookOpen },
            { to: "/community", get label() { return uiText("navigation:community_bfd58e"); }, icon: Users },
            { to: "/progress", get label() { return uiText("navigation:progress_1b9027"); }, icon: TrendingUp },
            { to: "/profile", get label() { return uiText("navigation:profile_ff4fc0"); }, icon: User },
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
  useInterfaceLocale();
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
