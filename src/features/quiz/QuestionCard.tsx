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
import { memo } from "react";
import type { ClientError } from "@/lib/api/errors";
import type { QuizResponse } from "@/lib/api/types";
import { describeError } from "@/lib/api/error-map";
import { cn } from "@/components/sa/primitives";

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
  /** Category accent (CSS color) — defaults to ember. */
  color?: string;
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
  color = "var(--ember)",
}: QuestionCardProps) {
  if (question.question_type !== "multiple_choice") {
    return (
      <div className="panel p-6">
        <p role="alert" className="text-destructive">
          This question type isn't supported yet ({question.question_type}). Please
          return to the module.
        </p>
      </div>
    );
  }

  const answeredCount = answeredQuestionIds.size;
  const unanswered = total - answeredCount;

  return (
    <div className="mx-auto max-w-3xl pb-24 lg:pb-0">
      {/* Sticky navigation (mobile) */}
      <nav className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-background/95 p-3 backdrop-blur-md lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoPrevious || submitting}
            className="min-h-12 flex-1 rounded-lg border border-border px-4 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-40"
          >
            Previous
          </button>
          {canGoNext ? (
            <button
              type="button"
              onClick={onNext}
              disabled={submitting}
              className="min-h-12 flex-1 rounded-lg bg-primary px-4 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="glow-ember flex min-h-12 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit field test"}
            </button>
          )}
        </div>
      </nav>

      <section className="panel p-6 sm:p-8">
        <fieldset>
          <legend className="sr-only">Answer options</legend>
          <h2 className="text-xl leading-snug font-medium">{question.question_text}</h2>
          <div className="mt-6 grid gap-3" role="radiogroup" aria-label={`Question ${index + 1}`}>
            {question.options.map((option, i) => {
              const checked = selected === option.label;
              return (
                <label
                  key={option.label}
                  className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 transition-colors"
                  style={{
                    borderColor: checked ? color : "var(--border)",
                    background: checked
                      ? `color-mix(in oklab, ${color} 12%, transparent)`
                      : "var(--surface-2)",
                    boxShadow: checked ? `0 0 26px -10px ${color}` : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${question.question_id}`}
                    value={option.label}
                    checked={checked}
                    onChange={() => { onSelect(question.question_id, option.label); }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-md border font-mono text-xs"
                    style={{
                      borderColor: checked ? color : "var(--border)",
                      color: checked ? color : "var(--muted-foreground)",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-[15px]">{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <div className="panel-2 mt-4 grid grid-cols-2 gap-3 p-4 text-center sm:grid-cols-3">
        <div>
          <p className="eyebrow">Answered</p>
          <p className="font-display text-xl">{answeredCount}</p>
        </div>
        <div>
          <p className="eyebrow">Unanswered</p>
          <p className="font-display text-xl">{unanswered}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="eyebrow">Draft</p>
          <p className="font-mono text-xs text-muted-foreground">Saved automatically</p>
        </div>
      </div>

      {/* Question map (✓ answered / — unanswered, neutral colors) */}
      <nav aria-label="Question navigator" className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {Array.from({ length: total }, (_, i) => {
            const answered = answeredQuestionIds.has(questionIds[i] ?? "");
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={submitting}
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ", unanswered"}`}
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
            {answeredCount} of {total} answered
            {unanswered > 0 ? (
              <span className="text-warning"> — {unanswered} unanswered</span>
            ) : null}
          </p>
          {unanswered > 0 ? (
            <p className="mt-1 text-muted-foreground">
              Unanswered questions are submitted as skipped. You can still go
              back and answer them.
            </p>
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
          >
            Retry submission
          </button>
        </div>
      ) : null}

    </div>
  );
});
