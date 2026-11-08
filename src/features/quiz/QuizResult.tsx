/**
 * Quiz result deep-link route (Phase 23) — renders the authoritative
 * attempt result for /modules/:moduleId/quiz/result/:attemptId. The
 * server payload is the only source of score/XP/explanations.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { EmptyState } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchAttemptResult } from "./quiz.api";
import { QuizResultView } from "./QuizResultView";

export default function QuizResultPage() {
  useInterfaceLocale();
  const { moduleId, attemptId } = useParams();
  const attempt = Number(attemptId);
  const navigate = useNavigate();

  const moduleQuery = useQuery({
    queryKey: typeof moduleId === "string" ? queryKeys.content.module(moduleId) : ["modules", "invalid"],
    queryFn: () => fetchModule(moduleId as string),
    staleTime: 30_000,
    retry: false,
    enabled: typeof moduleId === "string" && Number.isInteger(attempt) && attempt > 0,
  });

  const quizId = moduleQuery.data?.quiz?.quiz_id;

  const resultQuery = useQuery({
    queryKey:
      quizId && Number.isInteger(attempt) && attempt > 0
        ? queryKeys.learning.attempt(quizId, attempt)
        : ["quizzes", "invalid", "result"],
    queryFn: () => fetchAttemptResult(quizId as string, attempt),
    retry: false,
    enabled: Boolean(quizId) && Number.isInteger(attempt) && attempt > 0,
  });

  if (typeof moduleId !== "string" || !Number.isInteger(attempt) || attempt <= 0) {
    return (
      <EmptyState
        title={uiText("learning:result_unavailable_961ca2")}
        description={uiText("learning:this_result_link_isn_t_valid_d219ce")}
        action={
          <Link
            to="/categories"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >{uiText("learning:explore_regions_93f848")}</Link>
        }
      />
    );
  }

  if (moduleQuery.isPending || resultQuery.isPending) {
    return (
      <div role="status" aria-label={uiText("learning:loading_result_9b5f36")} className="space-y-6">
        <div className="panel h-80 animate-pulse" aria-hidden="true" />
      </div>
    );
  }
  if (moduleQuery.isError || resultQuery.isError) {
    const error = moduleQuery.isError ? moduleQuery.error : resultQuery.error;
    return <ErrorState error={error} onRetry={() => void resultQuery.refetch()} />;
  }
  const result = resultQuery.data;

  return (
    <QuizResultView
      moduleId={moduleId}
      quizTitle={moduleQuery.data.quiz?.title ?? "Field Test"}
      categorySlug={moduleQuery.data.category}
      result={result}
      onRetry={() => {
        void navigate(`/modules/${moduleId}/quiz`);
      }}
      // Deep-link route: no pre-submit snapshot exists, so no reveal is
      // attempted — nothing is fabricated.
    />
  );
}
