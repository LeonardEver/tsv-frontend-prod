/**
 * Route map (frontend spec §5.2).
 *
 * - Canonical IDs in URLs; lesson/quiz nest under their module.
 * - Deep-link aliases (/lessons/:id, /quizzes/:id) resolve the module via
 *   the API and redirect to the canonical route.
 * - NO /register route: the backend auto-provisions accounts on first
 *   OIDC login (spec §6.1) — no registration behavior is invented.
 * - Quiz routes carry NO lesson-completion guard (DEC-022).
 */
import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { RequireAuth, RedirectIfAuthed } from "@/features/auth/guards";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { AppShell } from "@/components/layout/AppShell";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";
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

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginScreen />
      </RedirectIfAuthed>
    ),
  },
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
    path: "*",
    element: (
      <RequireAuth>
        <AppShell>
          <PagePlaceholder title="Not found" note="This page doesn't exist." />
        </AppShell>
      </RequireAuth>
    ),
  },
]);
