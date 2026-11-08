/**
 * Route map (frontend spec §5.2 + production auth phase).
 *
 * - Canonical IDs in URLs; lesson/quiz nest under their module.
 * - Deep-link aliases (/lessons/:id, /quizzes/:id) resolve the module via
 *   the API and redirect to the canonical route.
 * - Credential auth screens (/register, /verify-email, /forgot-password,
 *   /reset-password) sit beside /login; /terms, /privacy and /landing are
 *   public.
 * - Quiz routes carry NO lesson-completion guard (DEC-022).
 */
import { NotFoundPage } from "./not-found";
import { lazy } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RouteErrorElement } from "./route-error";
import { RequireAuth, RedirectIfAuthed } from "@/features/auth/guards";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { RegisterScreen } from "@/features/auth/RegisterScreen";
import { VerifyEmailScreen } from "@/features/auth/VerifyEmailScreen";
import { ForgotPasswordScreen } from "@/features/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/features/auth/ResetPasswordScreen";
import { TermsScreen } from "@/features/legal/TermsScreen";
import { PrivacyScreen } from "@/features/legal/PrivacyScreen";
import { AppShell } from "@/components/layout/AppShell";
import { RootRedirect, LessonAlias, QuizAlias, LearnAlias } from "./redirects";

const DashboardPage = lazy(() => import("@/features/dashboard"));
const CategoriesPage = lazy(() => import("@/features/categories"));
const CategoryDetailPage = lazy(() => import("@/features/categories/CategoryDetail"));
const ModuleDetailPage = lazy(() => import("@/features/modules/ModuleDetail"));
const LessonPage = lazy(() => import("@/features/lesson"));
const QuizPage = lazy(() => import("@/features/quiz"));
const QuizResultPage = lazy(() => import("@/features/quiz/QuizResult"));
const ResourcePage = lazy(() => import("@/features/resources"));
const ProgressPage = lazy(() => import("@/features/progress"));
const GamificationPage = lazy(() => import("@/features/gamification"));
const ProfilePage = lazy(() => import("@/features/profile"));

const PlansPage = lazy(() => import("@/features/plans"));
const CommunityPage = lazy(() => import("@/features/community"));
const CreatePostPage = lazy(() => import("@/features/community/CreatePost"));
const PostDetailPage = lazy(() => import("@/features/community/PostDetail"));
const LandingPage = lazy(() => import("./landing/LandingPage"));

// ── Simplified experience (§ guided-learning) ──
// An additive experience beside PRO, not a replacement: nothing here
// changes a PRO route. All three surfaces sit OUTSIDE AppShell because
// SimplifiedShell supplies its own chrome (header, mode switch, bottom
// nav) — they still carry RequireAuth. The mode preference alone does
// not gate these routes: a learner may deep-link either experience.
const SimplifiedHomePage = lazy(() => import("@/features/simplified"));
const SimplifiedMissionPage = lazy(() =>
  import("@/features/simplified").then((module) => ({ default: module.SimplifiedMission })),
);
const SimplifiedFieldTestPage = lazy(() =>
  import("@/features/simplified").then((module) => ({ default: module.SimplifiedFieldTest })),
);

// ── Admin analytics (§ admin-only surface) ──
// The layout is one lazy chunk; each tab is its own chunk so a section
// loads only the endpoints it needs. Access is decided server-side — the
// layout's capability probe renders the denied state, so these routes
// stay registered for everyone and simply refuse to render data.
const AdminAnalyticsPage = lazy(() => import("@/features/admin-analytics"));
const AnalyticsOverviewTab = lazy(() => import("@/features/admin-analytics/tabs/OverviewTab"));
const AnalyticsUsersTab = lazy(() => import("@/features/admin-analytics/tabs/UsersTab"));
const AnalyticsEngagementTab = lazy(
  () => import("@/features/admin-analytics/tabs/EngagementTab"),
);
const AnalyticsLearningTab = lazy(() => import("@/features/admin-analytics/tabs/LearningTab"));
const AnalyticsContentTab = lazy(() => import("@/features/admin-analytics/tabs/ContentTab"));
const AnalyticsGapsTab = lazy(() => import("@/features/admin-analytics/tabs/GapsTab"));
const AnalyticsStalledTab = lazy(() => import("@/features/admin-analytics/tabs/StalledTab"));
const AnalyticsRetentionTab = lazy(() => import("@/features/admin-analytics/tabs/RetentionTab"));
const AnalyticsCommunityTab = lazy(() => import("@/features/admin-analytics/tabs/CommunityTab"));
const AnalyticsGamificationTab = lazy(
  () => import("@/features/admin-analytics/tabs/GamificationTab"),
);
const AnalyticsBillingTab = lazy(() => import("@/features/admin-analytics/tabs/BillingTab"));
const AnalyticsGeographyTab = lazy(() => import("@/features/admin-analytics/tabs/GeographyTab"));

const appRoutes: RouteObject[] = [
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginScreen />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/register",
    element: (
      <RedirectIfAuthed>
        <RegisterScreen />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/verify-email",
    element: (
      <RedirectIfAuthed>
        <VerifyEmailScreen />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <RedirectIfAuthed>
        <ForgotPasswordScreen />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <RedirectIfAuthed>
        <ResetPasswordScreen />
      </RedirectIfAuthed>
    ),
  },
  // Legal pages — public, linked from registration and the footer.
  { path: "/terms", element: <TermsScreen /> },
  { path: "/privacy", element: <PrivacyScreen /> },
  // Marketing landing — public, no shell and no auth guard. Its styles are a
  // CSS module precisely so they cannot leak into the app routes above.
  { path: "/landing", element: <LandingPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell>
          <RootRedirect />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/simplified",
    element: (
      <RequireAuth>
        <SimplifiedHomePage />
      </RequireAuth>
    ),
  },
  {
    path: "/simplified/missions/:moduleId",
    element: (
      <RequireAuth>
        <SimplifiedMissionPage />
      </RequireAuth>
    ),
  },
  {
    path: "/simplified/missions/:moduleId/test",
    element: (
      <RequireAuth>
        <SimplifiedFieldTestPage />
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/categories",
    element: (
      <RequireAuth>
        <AppShell>
          <CategoriesPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/categories/:categorySlug",
    element: (
      <RequireAuth>
        <AppShell>
          <CategoryDetailPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/modules/:moduleId",
    element: (
      <RequireAuth>
        <AppShell>
          <ModuleDetailPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/modules/:moduleId/lesson",
    element: (
      <RequireAuth>
        <AppShell>
          <LessonPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/modules/:moduleId/quiz",
    element: (
      <RequireAuth>
        <AppShell>
          <QuizPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/modules/:moduleId/quiz/result/:attemptId",
    element: (
      <RequireAuth>
        <AppShell>
          <QuizResultPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/resources/:resourceId",
    element: (
      <RequireAuth>
        <AppShell>
          <ResourcePage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/progress",
    element: (
      <RequireAuth>
        <AppShell>
          <ProgressPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/gamification",
    element: (
      <RequireAuth>
        <AppShell>
          <GamificationPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/profile",
    element: (
      <RequireAuth>
        <AppShell>
          <ProfilePage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/plans",
    element: (
      <RequireAuth>
        <AppShell>
          <PlansPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/community",
    element: (
      <RequireAuth>
        <AppShell>
          <CommunityPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/community/new",
    element: (
      <RequireAuth>
        <AppShell>
          <CreatePostPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/community/posts/:postId",
    element: (
      <RequireAuth>
        <AppShell>
          <PostDetailPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  // /learn aliases (Phase 23 §9): the Lovable reference paths soft-land on
  // the production canonical routes.
  {
    path: "/learn",
    element: (
      <RequireAuth>
        <AppShell>
          <LearnAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/learn/:category",
    element: (
      <RequireAuth>
        <AppShell>
          <LearnAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/learn/:category/:module",
    element: (
      <RequireAuth>
        <AppShell>
          <LearnAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/learn/:category/:module/lesson",
    element: (
      <RequireAuth>
        <AppShell>
          <LearnAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/learn/:category/:module/quiz",
    element: (
      <RequireAuth>
        <AppShell>
          <LearnAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/learn/:category/:module/quiz/result",
    element: (
      <RequireAuth>
        <AppShell>
          <LearnAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  // Deep-link aliases (spec §5.2): resolve entity → canonical module route.
  {
    path: "/lessons/:lessonId",
    element: (
      <RequireAuth>
        <AppShell>
          <LessonAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/quizzes/:quizId",
    element: (
      <RequireAuth>
        <AppShell>
          <QuizAlias />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <RequireAuth>
        <AppShell>
          <AdminAnalyticsPage />
        </AppShell>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AnalyticsOverviewTab /> },
      { path: "users", element: <AnalyticsUsersTab /> },
      { path: "engagement", element: <AnalyticsEngagementTab /> },
      { path: "learning", element: <AnalyticsLearningTab /> },
      { path: "content", element: <AnalyticsContentTab /> },
      { path: "gaps", element: <AnalyticsGapsTab /> },
      { path: "stalled", element: <AnalyticsStalledTab /> },
      { path: "retention", element: <AnalyticsRetentionTab /> },
      { path: "community", element: <AnalyticsCommunityTab /> },
      { path: "gamification", element: <AnalyticsGamificationTab /> },
      { path: "billing", element: <AnalyticsBillingTab /> },
      { path: "geography", element: <AnalyticsGeographyTab /> },
    ],
  },
  {
    path: "*",
    element: (
      <RequireAuth>
        <AppShell>
          <NotFoundPage />
        </AppShell>
      </RequireAuth>
    ),
  },
];

/**
 * One pathless root wraps every route above. It renders no element of its own
 * — the children flow straight through the implicit Outlet — and exists only
 * to give the whole map a styled errorElement, so no screen can ever fall back
 * to React Router's raw crash page. Declaring it once here is the reason the
 * route list below needs no per-route error handling.
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorElement />,
    children: appRoutes,
  },
]);
