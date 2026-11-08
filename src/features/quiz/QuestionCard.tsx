/**
 * QuestionCard — one question at a time (Phase 23: Lovable field-test
 * visual structure — letter tiles, category-colored selection, progress
 * strip, sticky navigation — over the unchanged quiz session logic).
 *
 * - Radio-group semantics for multiple_choice (the only backend type);
 *   any unsupported question_type renders an explicit safe error.
 * - The question map shows answered (✓) / unanswered (—) state ONLY, in
 *   neutral colors — the frontend does not know correctness before
 *   submission and must never imply it.
 * - Submission resilience: duplicate activation blocked by the
 *   submitting state; retries reuse the same logical submission.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { memo, useEffect, useRef } from "react";
import { ArrowRight, Check, CloudCheck } from "lucide-react";
import type { ClientError } from "@/lib/api/errors";
import type { QuizResponse } from "@/lib/api/types";
import { describeError } from "@/lib/api/error-map";
import { cn } from "@/components/sa/primitives";
import styles from "./quiz.module.css";

type QuizQuestion = QuizResponse["questions"][number];

export interface QuestionCardProps {
  question: QuizQuestion;
  selected: string | undefined;
  onSelect: (questionId: string, answer: string) => void;
  index: number;
  total: number;
  /** Canonical question IDs in order — maps the navigator to answers. */
  questionIds: string[];
  answeredQuestionIds: Set<string>;
  onPrevious: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  submitting: boolean;
  onSubmit: () => void;
  submissionError: ClientError | null;
  onRetrySubmission: () => void;
}

export const QuestionCard = memo(function QuestionCard({
  question,
  selected,
  onSelect,
  index,
  total,
  questionIds,
  answeredQuestionIds,
  onPrevious,
  onNext,
  onGoTo,
  canGoPrevious,
  canGoNext,
  submitting,
  onSubmit,
  submissionError,
  onRetrySubmission,
}: QuestionCardProps) {
  useInterfaceLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousQuestion = useRef(question.question_id);
  useEffect(() => {
    if (previousQuestion.current !== question.question_id) {
      previousQuestion.current = question.question_id;
      headingRef.current?.focus({ preventScroll: true });
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [question.question_id]);
  if (question.question_type !== "multiple_choice") {
    return (
      <div className="panel p-6">
        <p role="alert" className="text-destructive">{uiText("learning:this_question_type_isn_t_supported_yet_e36793", { value0: uiValue(question.question_type) })}</p>
      </div>
    );
  }

  const answeredCount = answeredQuestionIds.size;
  const unanswered = total - answeredCount;

  return (
    <div className={styles.card}>
      {/* Sticky navigation (mobile) */}
      <nav aria-label={uiText("learning:question_actions_807113")} className={styles.footer}>
        <div className={styles.footerInner}>
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoPrevious || submitting}
            className={styles.previous}
          >{uiText("learning:previous_50f942")}</button>
          {canGoNext ? (
            <button
              type="button"
              onClick={onNext}
              disabled={submitting}
              className={styles.next}
            >{uiText("learning:next_bc9819")}{" "}<ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className={styles.next}
            >
              {submitting ? uiText("learning:submitting_25bdf9") : uiText("learning:submit_field_test_5a777a")}
            </button>
          )}
        </div>
      </nav>

      <section>
        <fieldset>
          <legend className="sr-only">{uiText("learning:answer_options_c9ef76")}</legend>
          <h2 ref={headingRef} tabIndex={-1} className={styles.question}>{question.question_text}</h2>
          <p className={styles.instructions}>{uiText("learning:choose_the_best_answer_40f900")}</p>
          <div className={styles.options} role="radiogroup" aria-label={uiText("learning:question_value_959992", { value0: uiValue(index + 1) })}>
            {question.options.map((option) => {
              const checked = selected === option.label;
              return (
                <label
                  key={option.label}
                  className={styles.option}
                >
                  <input
                    type="radio"
                    name={`question-${question.question_id}`}
                    value={option.label}
                    checked={checked}
                    disabled={submitting}
                    onChange={() => { onSelect(question.question_id, option.label); }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={styles.choice}
                  >
                    <Check />
                  </span>
                  <span className={styles.optionText}>{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <p className={styles.saved}><CloudCheck size={14} />{" "}{uiText("learning:saved_automatically_results_after_submission_c178e0")}</p>

      {/* Question map (✓ answered / — unanswered, neutral colors) */}
      <nav aria-label={uiText("learning:question_navigator_59264b")} className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {Array.from({ length: total }, (_, i) => {
            const answered = answeredQuestionIds.has(questionIds[i] ?? "");
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={submitting}
                  aria-label={uiText("learning:question_valuevalue_cc94d6", { value0: uiValue(i + 1), value1: uiValue(answered ? uiText("learning:answered_3cabd3") : uiText("learning:unanswered_80b9fb")) })}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => { onGoTo(i); }}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                    i === index
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span className="flex flex-col items-center leading-none">
                    <span>{i + 1}</span>
                    <span className="text-[9px] text-muted-foreground" aria-hidden="true">
                      {answered ? "✓" : "—"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Review strip (last question) */}
      {!canGoNext ? (
        <div className="panel-2 mt-4 p-4 text-sm" role="status">
          <p>
            {answeredCount}{" "}{uiText("learning:of_de04fa")}{" "}{total}{" "}{uiText("learning:answered_76e806")}{unanswered > 0 ? (
              <span className="text-warning">{uiText("learning:value_unanswered_2601f8", { value0: uiValue(unanswered) })}</span>
            ) : null}
          </p>
          {unanswered > 0 ? (
            <p className="mt-1 text-muted-foreground">{uiText("learning:unanswered_questions_are_submitted_as_skipped_you_3fb73a")}</p>
          ) : null}
        </div>
      ) : null}

      {/* Submission errors (recoverable; same logical submission) — Phase
          21 §15: quota denials carry the reset/upgrade guidance from the
          stable error-code map. */}
      {submissionError ? (
        <div
          role="alert"
          className="mt-4 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="text-sm text-destructive">{describeError(submissionError).title}</p>
          {describeError(submissionError).description ? (
            <p className="text-sm text-muted-foreground">
              {describeError(submissionError).description}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRetrySubmission}
            disabled={submitting}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
          >{uiText("learning:retry_submission_4b4845")}</button>
        </div>
      ) : null}

    </div>
  );
});
