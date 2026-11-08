import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { ContentLanguageNotice } from "@/i18n/ContentLanguageNotice";
import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, RotateCcw } from "lucide-react";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchQuiz } from "@/features/quiz/quiz.api";
import { useQuizSession } from "@/features/quiz/useQuizSession";
import { useAuth } from "@/features/auth/auth-context";
import { allLocales, queryKeys } from "@/lib/api/keys";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/ErrorState";
import { QuizResultView } from "@/features/quiz/QuizResultView";
import { SimplifiedShell } from "./SimplifiedShell";
import { missionGateFrom } from "./mission-gate";
import { simplifiedResultActions } from "./result-actions";
import { useGuidedRoadmap } from "./use-guided-roadmap";
import { visualWorld } from "./config";
import styles from "./simplified.module.css";

export default function SimplifiedFieldTest() {
  useInterfaceLocale();
  const { moduleId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const modQuery = useQuery({ queryKey: queryKeys.content.module(moduleId), queryFn: () => fetchModule(moduleId), placeholderData: (previous) => previous?.module_id === moduleId ? previous : undefined, retry: false });
  const gate = missionGateFrom(modQuery.data);
  const quizId = modQuery.data?.quiz?.quiz_id;
  // Only fetched once the mission is complete: a locked learner never even
  // requests the questions, so the block holds at the network boundary too.
  const quizQuery = useQuery({
    queryKey: quizId ? queryKeys.content.quiz(quizId) : ["quizzes", "pending"],
    queryFn: () => fetchQuiz(quizId ?? ""),
    placeholderData: (previous) => previous?.quiz_id === quizId ? previous : undefined,
    enabled: Boolean(quizId) && gate === "open",
    retry: false,
  });
  // The roadmap is read for the RESULT screen's "what comes next", and answers
  // it with the same canonical progression Home uses — never a local rule.
  const guided = useGuidedRoadmap();
  const onSubmitted = useCallback(() => {
    if (quizId) void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.quiz(quizId)) });
    void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.module(moduleId)) });
    void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.modulesAll) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.learning.progress });
    void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.summary });
    void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.gamification.achievements) });
  }, [queryClient, quizId, moduleId]);
  // A locked mission gets no session at all: no attempt is created and no
  // draft is written for a field test the learner has not earned yet.
  const session = useQuizSession(gate === "open" ? quizQuery.data ?? null : null, user?.user_id ?? 0, onSubmitted);

  if (modQuery.isError) return <SimplifiedShell><ErrorState error={modQuery.error} onRetry={() => void modQuery.refetch()} /></SimplifiedShell>;
  if (modQuery.isPending) return <SimplifiedShell><div role="status" aria-label={uiText("learning:loading_field_test_56f536")} className={styles.loading} /></SimplifiedShell>;

  const mod = modQuery.data;

  // Direct navigation to a field test for an unfinished mission is blocked the
  // same way the gated PRO quiz screen blocks it — with an explanation and a
  // way back, not a redirect that would hide what happened.
  if (gate === "locked") {
    return (
      <SimplifiedShell>
        <section className={`${styles.testWorld} ${visualWorld(mod.category).environmentClass}`}>
          <div className={styles.testBody}>
            <section className={styles.lessonStage}>
              <LockKeyhole className={styles.completeIcon} />
              <h2>{uiText("learning:field_test_unlocks_after_completion_6c7160")}</h2>
              <p>{uiText("learning:finish_the_lesson_and_complete_this_mission_6c9243")}</p>
              <Button asChild><Link to={`/simplified/missions/${moduleId}`}>{uiText("learning:return_to_mission_b57367")}</Link></Button>
            </section>
          </div>
        </section>
      </SimplifiedShell>
    );
  }

  if (quizQuery.isError) return <SimplifiedShell><ErrorState error={quizQuery.error} onRetry={() => void quizQuery.refetch()} /></SimplifiedShell>;
  if (quizId && quizQuery.isPending) return <SimplifiedShell><div role="status" aria-label={uiText("learning:loading_field_test_56f536")} className={styles.loading} /></SimplifiedShell>;

  const quiz = quizQuery.data;
  if (!quiz) {
    return (
      <SimplifiedShell>
        <section className={styles.empty}><h1>{uiText("learning:field_test_unavailable_03d805")}</h1><Link to="/simplified">{uiText("learning:return_to_path_7d9304")}</Link></section>
      </SimplifiedShell>
    );
  }
  const world = visualWorld(mod.category);
  const state = session.state;
  const question = quiz.questions[session.currentQuestionIndex];
  // Where the learner goes next, from the canonical roadmap. Still the same
  // mission when the attempt did not complete it, the next one when it did,
  // and null once the region is finished.
  const nextMissionId = guided.status === "ready" ? guided.roadmap.current?.module_id ?? null : null;

  return (
    <SimplifiedShell>
      <div className={`${styles.testWorld} ${world.environmentClass}`}>
        <header className={styles.testHeader}>
          <Link to={`/simplified/missions/${moduleId}`} className={styles.back}><ArrowLeft />{" "}{uiText("learning:mission_e4698d")}</Link>
          <span className={styles.kicker}>{uiText("learning:field_test_c7b676")}</span>
          <h1>{quiz.title}</h1>
          <p>{uiText("learning:value_questions_value_89baec", { value0: uiValue(quiz.question_count), value1: uiValue(mod.title) })}</p>
        </header>
        <ContentLanguageNotice data={quiz} />
        <div className={styles.testBody}>
          {state.name === "loading" ? (
            <div role="status">{uiText("learning:preparing_your_questions_11c71c")}</div>
          ) : state.name === "error" ? (
            <ErrorState error={state.error} onRetry={session.retryCreation} />
          ) : state.name === "ready" || state.name === "creating" ? (
            <section className={styles.lessonStage}><span className={styles.kicker}>{uiText("learning:ready_when_you_are_aec132")}</span><h2>{uiText("learning:test_your_field_knowledge_a79e0d")}</h2><p>{uiText("learning:answers_are_checked_only_after_you_submit_3eec9d")}</p><Button loading={state.name === "creating"} onClick={session.startAttempt}>{uiText("learning:start_field_test_00315e")}{" "}<ArrowRight /></Button></section>
          ) : state.name === "recover" ? (
            <section className={styles.lessonStage}><h2>{uiText("learning:continue_your_field_test_ecf238")}</h2><p>{uiText("learning:your_previous_answers_are_saved_0f2473")}</p><div className={styles.stageActions}><Button variant="secondary" onClick={session.discardDraft}><RotateCcw />{" "}{uiText("learning:start_over_51dd91")}</Button><Button onClick={session.continueDraft}>{uiText("learning:continue_2e0262")}{" "}<ArrowRight /></Button></div></section>
          ) : state.name === "result" ? (
            <QuizResultView
              moduleId={moduleId}
              quizTitle={quiz.title}
              result={state.result}
              onRetry={session.reset}
              categorySlug={mod.category}
              simplifiedActions={{ missionId: moduleId, next: simplifiedResultActions(moduleId, nextMissionId) }}
            />
          ) : question ? (
            <section className={styles.lessonStage}>
              <div className={styles.progressHeader}><span>{uiText("learning:question_value_value_eb4ea3", { value0: uiValue(session.currentQuestionIndex + 1), value1: uiValue(quiz.questions.length) })}</span><strong>{uiText("learning:value_answered_da643d", { value0: uiValue(session.answeredCount) })}</strong></div>
              <div className={styles.progressTrack}><span style={{ width: `${((session.currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }} /></div>
              {question.question_type === "multiple_choice" ? (
                <fieldset className={styles.question}><legend>{question.question_text}</legend>
                  {question.options.map((option) => (
                    <label key={option.label} className={styles.option}>
                      <input type="radio" name={question.question_id} value={option.label} checked={session.answers[question.question_id] === option.label} onChange={() => { session.selectAnswer(question.question_id, option.label); }} />
                      <span>{option.label}</span>{option.text}
                    </label>
                  ))}
                </fieldset>
              ) : <p role="alert">{uiText("learning:this_question_type_is_not_supported_in_4bb7fc")}</p>}
              <div className={styles.stageActions}>
                <Button variant="secondary" disabled={session.currentQuestionIndex === 0 || state.name === "submitting"} onClick={session.previousQuestion}>{uiText("learning:back_b52b36")}</Button>
                {session.currentQuestionIndex < quiz.questions.length - 1 ? (
                  <Button disabled={state.name === "submitting"} onClick={session.nextQuestion}>{uiText("learning:next_bc9819")}{" "}<ArrowRight /></Button>
                ) : (
                  <Button loading={state.name === "submitting"} onClick={session.submit}><Check />{" "}{uiText("learning:submit_test_c0cb14")}</Button>
                )}
              </div>
              {session.submissionError ? <div role="alert" className={styles.submissionError}><p>{uiText("learning:we_couldn_t_submit_your_answers_they_09acc7")}</p><Button onClick={session.retrySubmission}>{uiText("learning:retry_submission_4b4845")}</Button></div> : null}
            </section>
          ) : <p>{uiText("learning:no_questions_are_available_for_this_test_0c6eea")}</p>}
        </div>
      </div>
    </SimplifiedShell>
  );
}
