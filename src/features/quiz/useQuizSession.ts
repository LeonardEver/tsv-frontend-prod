/**
 * Quiz session — an EXPLICIT state machine (Phase 13 §8).
 *
 * Illegal transitions are impossible by construction: every state is a
 * tagged union, not a combination of booleans.
 *
 * Authoritative data: quiz payload, attempt identity, results. Local
 * data: answer selections (draft), navigation index, the idempotency
 * keys that belong to THIS logical attempt/submission.
 *
 * Resilience contract:
 * - the SAME creation key is reused for every retry of one logical
 *   attempt creation; the SAME submission key for one logical
 *   submission; retry never creates a new attempt
 * - 409 on submission → recover the historical result (E5), never a
 *   generic error
 * - network failure on submission → check the attempt status first,
 *   then retry the same logical submission — the draft is never cleared
 *   before the backend confirms success
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, NetworkError, TimeoutError, type ClientError } from "@/lib/api/errors";
import { analytics } from "@/lib/analytics/events";
import {
  createAttempt,
  fetchAttemptResult,
  submitAnswers,
} from "./quiz.api";
import type { QuizResponse, QuizSubmissionResponse } from "@/lib/api/types";
import {
  DRAFT_VERSION,
  clearDraft,
  readDraftForQuiz,
  saveDraft,
} from "./draft";

export type QuizState =
  | { name: "loading" }
  | { name: "ready" }
  | { name: "recover"; draft: { attemptId: number; answers: Record<string, string>; currentQuestionIndex: number } }
  | { name: "creating" }
  | { name: "active"; attemptId: number }
  | { name: "submitting"; attemptId: number }
  | { name: "result"; attemptId: number; result: QuizSubmissionResponse }
  | { name: "error"; error: ClientError };

export interface QuizSession {
  state: QuizState;
  quiz: QuizResponse | null;
  /** question_id → selected answer (client-owned, never authoritative). */
  answers: Record<string, string>;
  currentQuestionIndex: number;
  /** number of questions with a selected answer */
  answeredCount: number;
  /** Draft-presence flag for the recovery prompt. */
  startAttempt: () => void;
  continueDraft: () => void;
  discardDraft: () => void;
  selectAnswer: (questionId: string, answer: string) => void;
  goToQuestion: (index: number) => void;
  previousQuestion: () => void;
  nextQuestion: () => void;
  submit: () => void;
  /** Retry the SAME logical submission (same attempt, same key). */
  retrySubmission: () => void;
  /** Retry the SAME logical attempt creation (same key). */
  retryCreation: () => void;
  /** Return to the intro after a result. */
  reset: () => void;
  submissionError: ClientError | null;
}

const DRAFT_DEBOUNCE_MS = 300;

export function useQuizSession(
  quiz: QuizResponse | null,
  userId: number,
  onSubmitted: () => void,
): QuizSession {
  const [state, setState] = useState<QuizState>({ name: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submissionError, setSubmissionError] = useState<ClientError | null>(null);

  // One idempotency key per logical creation — generated ONCE per mount
  // and reused across every retry of the same creation.
  const creationKeyRef = useRef<string>("");
  // One idempotency key per logical submission (per attempt).
  const submissionKeyRef = useRef<string>("");

  const quizId = quiz?.quiz_id ?? null;

  // ── Quiz load transition + draft recovery scan (one-shot per quiz) ──
  const handledQuizIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!quiz) return;
    if (handledQuizIdRef.current === quiz.quiz_id) return;
    handledQuizIdRef.current = quiz.quiz_id;

    const existing = readDraftForQuiz(userId, quiz.quiz_id);
    if (existing) {
      setAnswers(existing.answers);
      setCurrentQuestionIndex(existing.currentQuestionIndex);
      setState({
        name: "recover",
        draft: {
          attemptId: existing.attemptId,
          answers: existing.answers,
          currentQuestionIndex: existing.currentQuestionIndex,
        },
      });
    } else {
      setState({ name: "ready" });
    }

    analytics.track({
      name: "quiz_viewed",
      properties: { quiz_id: quiz.quiz_id, module_id: quiz.module_id },
    });
  }, [quiz, userId]);

  const attemptId = useMemo(() => {
    if (state.name === "active" || state.name === "submitting" || state.name === "result") {
      return state.attemptId;
    }
    return null;
  }, [state]);

  // ── Debounced draft persistence (answers + index only) ──
  // Gated on the ACTIVE state: a pending debounce must never fire after
  // the attempt left the active state (it could resurrect a draft that
  // successful submission just cleared).
  useEffect(() => {
    if (state.name !== "active" || quizId === null) return;
    const timer = setTimeout(() => {
      saveDraft({
        version: DRAFT_VERSION,
        userId,
        quizId,
        attemptId: state.attemptId,
        answers,
        currentQuestionIndex,
        updatedAt: Date.now(),
      });
    }, DRAFT_DEBOUNCE_MS);
    return () => { clearTimeout(timer); };
  }, [state, quizId, userId, answers, currentQuestionIndex]);

  // ── Attempt creation mutation ──
  const createMutation = useMutation({
    mutationFn: (key: string) => createAttempt(quizId as string, key),
    onSuccess: (attempt) => {
      submissionKeyRef.current = crypto.randomUUID();
      setAnswers({});
      setCurrentQuestionIndex(0);
      setState({ name: "active", attemptId: attempt.attempt_id });
      analytics.track({
        name: "quiz_started",
        properties: { quiz_id: quizId ?? "", attempt_id: attempt.attempt_id },
      });
    },
    onError: (err: unknown) => {
      setState({ name: "error", error: normalizeClientError(err) });
    },
  });

  const startAttempt = useCallback(() => {
    if (state.name !== "ready" || createMutation.isPending) return;
    if (creationKeyRef.current === "") creationKeyRef.current = crypto.randomUUID();
    setState({ name: "creating" });
    createMutation.mutate(creationKeyRef.current);
  }, [state.name, createMutation]);

  const retryCreation = useCallback(() => {
    if (state.name !== "error" || quizId === null) return;
    // Same logical creation → SAME key. Never a new one.
    if (creationKeyRef.current === "") creationKeyRef.current = crypto.randomUUID();
    setState({ name: "creating" });
    createMutation.mutate(creationKeyRef.current);
  }, [state.name, quizId, createMutation]);

  const continueDraft = useCallback(() => {
    if (state.name !== "recover") return;
    submissionKeyRef.current = crypto.randomUUID();
    setState({ name: "active", attemptId: state.draft.attemptId });
  }, [state]);

  const discardDraft = useCallback(() => {
    if (state.name !== "recover" || quizId === null) return;
    clearDraft(userId, quizId, state.draft.attemptId);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setState({ name: "ready" });
  }, [state, quizId, userId]);

  // ── Submission mutation ──
  const submitMutation = useMutation({
    mutationFn: (key: string) =>
      submitAnswers({
        quizId: quizId as string,
        attemptId: attemptId as number,
        answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer })),
        idempotencyKey: key,
      }),
    onSuccess: (result) => {
      if (attemptId !== null && quizId !== null) {
        clearDraft(userId, quizId, attemptId);
      }
      setSubmissionError(null);
      setState({ name: "result", attemptId: attemptId as number, result });
      onSubmitted();
      analytics.track({
        name: "quiz_completed",
        properties: { quiz_id: quizId ?? "", attempt_id: attemptId ?? 0, passed: result.passed },
      });
    },
  });

  /** 409 → recover the historical result. Timeout/network → check the
   * server status before offering a retry (never blind re-submission). */
  const submit = useCallback(() => {
    if (state.name !== "active" || submitMutation.isPending) return;
    if (submissionKeyRef.current === "") submissionKeyRef.current = crypto.randomUUID();
    setSubmissionError(null);
    setState({ name: "submitting", attemptId: state.attemptId });

    submitMutation.mutate(submissionKeyRef.current, {
      onError: (err: unknown) => {
        const clientError = normalizeClientError(err);
        if (clientError instanceof ApiError && clientError.status === 409) {
          // The attempt was already graded by an earlier submission —
          // recover the authoritative result instead of erroring.
          void fetchAttemptResult(quizId as string, state.attemptId)
            .then((result) => {
              if (quizId !== null) clearDraft(userId, quizId, state.attemptId);
              setSubmissionError(null);
              setState({ name: "result", attemptId: state.attemptId, result });
              onSubmitted();
            })
            .catch(() => {
              setSubmissionError(clientError);
              setState({ name: "active", attemptId: state.attemptId });
            });
          return;
        }
        if (clientError instanceof TimeoutError || clientError instanceof NetworkError) {
          // Ambiguous outcome: ask the server before retrying.
          void fetchAttemptResult(quizId as string, state.attemptId)
            .then((result) => {
              if (result.status === "completed") {
                if (quizId !== null) clearDraft(userId, quizId, state.attemptId);
                setSubmissionError(null);
                setState({ name: "result", attemptId: state.attemptId, result });
                onSubmitted();
              } else {
                setSubmissionError(clientError);
                setState({ name: "active", attemptId: state.attemptId });
              }
            })
            .catch(() => {
              setSubmissionError(clientError);
              setState({ name: "active", attemptId: state.attemptId });
            });
          return;
        }
        // Definitive rejection (422/429/500/401/403): stay active, keep
        // the draft and the SAME submission key for the user's retry.
        setSubmissionError(clientError);
        setState({ name: "active", attemptId: state.attemptId });
      },
    });
  // `answers` is intentionally NOT a dependency: the mutationFn closure
  // is re-created each render with the current answers, and mutate()
  // always invokes the latest mutationFn.
  }, [state, quizId, userId, submitMutation, onSubmitted]);

  const retrySubmission = useCallback(() => {
    if (state.name !== "active" || submissionError === null) return;
    submit();
  }, [state.name, submissionError, submit]);

  const reset = useCallback(() => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmissionError(null);
    setState({ name: "ready" });
  }, []);

  // ── Answer / navigation actions (active-only) ──
  const selectAnswer = useCallback(
    (questionId: string, answer: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    [],
  );

  const goToQuestion = useCallback((index: number) => {
    setCurrentQuestionIndex(index);
  }, []);

  const previousQuestion = useCallback(() => {
    setCurrentQuestionIndex((i) => Math.max(0, i - 1));
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((i) =>
      Math.min((quiz?.questions.length ?? 1) - 1, i + 1),
    );
  }, [quiz]);

  return {
    state,
    quiz,
    answers,
    currentQuestionIndex,
    answeredCount: Object.keys(answers).length,
    startAttempt,
    continueDraft,
    discardDraft,
    selectAnswer,
    goToQuestion,
    previousQuestion,
    nextQuestion,
    submit,
    retrySubmission,
    retryCreation,
    reset,
    submissionError,
  };
}

function normalizeClientError(err: unknown): ClientError {
  if (err instanceof ApiError || err instanceof TimeoutError || err instanceof NetworkError) {
    return err;
  }
  return new NetworkError(err instanceof Error ? err.message : "Request failed");
}
