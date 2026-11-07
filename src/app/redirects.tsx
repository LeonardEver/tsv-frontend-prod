/**
 * Redirect helpers and deep-link aliases (frontend spec §5.2).
 * Split from router.tsx so the router file exports only the router
 * (keeps react-refresh happy and the route map readable).
 */
import { Navigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { request } from "@/lib/api/client";
import type { LessonResponse, QuizResponse } from "@/lib/api/types";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";
import { isValidCanonicalId } from "@/lib/validate/canonical-id";

export function RootRedirect() {
  return <Navigate to="/dashboard" replace />;
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
  const { category } = useParams();
  return <Navigate to={category ? `/categories/${category}` : "/categories"} replace />;
}

/** Deep-link alias: /lessons/:lessonId → canonical /modules/:moduleId/lesson. */
export function LessonAlias() {
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
  return <PagePlaceholder title="Lesson" note="Loading…" />;
}

/** Deep-link alias: /quizzes/:quizId → canonical /modules/:moduleId/quiz. */
export function QuizAlias() {
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
  return <PagePlaceholder title="Quiz" note="Loading…" />;
}
