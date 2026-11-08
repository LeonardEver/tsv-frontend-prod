/**
 * Redirect helpers and deep-link aliases (frontend spec §5.2).
 * Split from router.tsx so the router file exports only the router
 * (keeps react-refresh happy and the route map readable).
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { Navigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { request } from "@/lib/api/client";
import type { LessonResponse, QuizResponse } from "@/lib/api/types";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";
import { isValidCanonicalId } from "@/lib/validate/canonical-id";
// The ONE experience-preference store. Reading the key directly here would
// make a second source of truth for the same device preference.
import { useExperienceMode } from "@/features/simplified/state";

/**
 * "/" carries no experience of its own — it hands the authenticated learner to
 * whichever one they chose. The preference is a DEVICE setting, never a
 * viewport heuristic: choosing Simplified on a phone must not flip a desktop
 * session. No preference stored means PRO, exactly as before.
 */
export function RootRedirect() {
  useInterfaceLocale();
  const [mode] = useExperienceMode();
  return <Navigate to={mode === "simplified" ? "/simplified" : "/dashboard"} replace />;
}

/**
 * /learn aliases (Phase 23, spec §9): the Lovable reference uses
 * /learn/:category/:module paths; the production route contracts are
 * canonical (/categories, /modules/:id). /learn and /learn/:category map
 * 1:1. Deep module paths have no API-resolvable mapping (the API does not
 * expose per-module slugs), so they land on the region page — the closest
 * honest destination — instead of a dead link.
 */
export function LearnAlias() {
  useInterfaceLocale();
  const { category } = useParams();
  return <Navigate to={category ? `/categories/${category}` : "/categories"} replace />;
}

/** Deep-link alias: /lessons/:lessonId → canonical /modules/:moduleId/lesson. */
export function LessonAlias() {
  useInterfaceLocale();
  const { lessonId } = useParams();
  const valid = typeof lessonId === "string" && isValidCanonicalId(lessonId);
  const { data } = useQuery<LessonResponse | null>({
    queryKey: valid ? queryKeys.content.lesson(lessonId) : ["lessons", "invalid"],
    queryFn: valid
      ? () => request<LessonResponse>(`/lessons/${lessonId}`)
      : () => Promise.resolve(null),
    enabled: valid,
    retry: false,
  });
  if (!valid) return <Navigate to="/not-found" replace />;
  if (data?.module_id) return <Navigate to={`/modules/${data.module_id}/lesson`} replace />;
  return <PagePlaceholder title={uiText("common:lesson_188ecd")} note={uiText("common:loading_33ce41")} />;
}

/** Deep-link alias: /quizzes/:quizId → canonical /modules/:moduleId/quiz. */
export function QuizAlias() {
  useInterfaceLocale();
  const { quizId } = useParams();
  const valid = typeof quizId === "string" && isValidCanonicalId(quizId);
  const { data } = useQuery<QuizResponse | null>({
    queryKey: valid ? queryKeys.content.quiz(quizId) : ["quizzes", "invalid"],
    queryFn: valid
      ? () => request<QuizResponse>(`/quizzes/${quizId}`)
      : () => Promise.resolve(null),
    enabled: valid,
    retry: false,
  });
  if (!valid) return <Navigate to="/not-found" replace />;
  if (data?.module_id) return <Navigate to={`/modules/${data.module_id}/quiz`} replace />;
  return <PagePlaceholder title={uiText("common:quiz_25c86f")} note={uiText("common:loading_33ce41")} />;
}
