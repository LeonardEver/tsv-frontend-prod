/**
 * Quiz API (typed against the backend OpenAPI response schemas).
 *
 * The backend is the ONLY authority for identity, correctness, scoring,
 * pass/fail, XP and history. This module is pure transport.
 */
import { request } from "@/lib/api/client";
import type {
  AttemptCreateResponse,
  AttemptHistoryResponse,
  QuizResponse,
  QuizSubmissionResponse,
} from "@/lib/api/types";

export function fetchQuiz(quizId: string): Promise<QuizResponse> {
  return request<QuizResponse>(`/quizzes/${quizId}`);
}

/**
 * Create an attempt. The SAME Idempotency-Key must be reused when
 * retrying the same logical creation — the backend guarantees a single
 * attempt per (user, key) and replays deterministically (200).
 */
export function createAttempt(
  quizId: string,
  idempotencyKey: string,
): Promise<AttemptCreateResponse> {
  return request<AttemptCreateResponse>(`/quizzes/${quizId}/attempts`, {
    method: "POST",
    idempotencyKey,
  });
}

export interface SubmitAnswersInput {
  quizId: string;
  attemptId: number;
  answers: Array<{ question_id: string; answer: string }>;
  /** Same key for every retry of the SAME logical submission. */
  idempotencyKey: string;
}

export function submitAnswers(input: SubmitAnswersInput): Promise<QuizSubmissionResponse> {
  return request<QuizSubmissionResponse>(
    `/quizzes/${input.quizId}/attempts/${input.attemptId}/answers`,
    {
      method: "POST",
      body: {
        answers: input.answers,
        idempotency_key: input.idempotencyKey,
      },
    },
  );
}

/** Historical result (E5) — the immutable stored snapshot. */
export function fetchAttemptResult(
  quizId: string,
  attemptId: number,
): Promise<QuizSubmissionResponse> {
  return request<QuizSubmissionResponse>(`/quizzes/${quizId}/attempts/${attemptId}`);
}

export function fetchAttemptHistory(quizId: string): Promise<AttemptHistoryResponse> {
  return request<AttemptHistoryResponse>(`/quizzes/${quizId}/attempts`);
}
