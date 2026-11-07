/**
 * Quiz draft persistence (frontend spec §18 + Phase 13 §14–§16).
 *
 * The ONLY permitted localStorage usage: temporary user-owned answer
 * state, under the lint-enforced `quiz-draft:` namespace.
 *
 * Key identity: quiz-draft:{userId}:{quizId}:{attemptId} — prevents
 * collisions across users, quizzes and attempts; a draft belonging to
 * another user/quiz/attempt is never restored.
 *
 * Guarantees:
 * - explicit version (schema v1); mismatched/malformed drafts discarded
 * - drafts older than STALE_MS are discarded on read
 * - debounced writes; no persistence during render
 * - localStorage failures (disabled/quota/corruption) degrade to
 *   in-memory operation — storage is never a hard dependency
 * - NO correct answers, NO tokens, NO server scoring data — answers only
 */

export const DRAFT_VERSION = 1;
export const DRAFT_PREFIX = "quiz-draft:";
/** Conservative local staleness: 24h. Server history is never touched. */
export const DRAFT_STALE_MS = 24 * 60 * 60 * 1000;

export interface QuizDraft {
  version: number;
  userId: number;
  quizId: string;
  attemptId: number;
  /** question_id → selected option (canonical identity, never indexes). */
  answers: Record<string, string>;
  currentQuestionIndex: number;
  updatedAt: number;
}

function draftKey(userId: number, quizId: string, attemptId: number): string {
  return `${DRAFT_PREFIX}${userId}:${quizId}:${attemptId}`;
}

function isQuizDraft(value: unknown): value is QuizDraft {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    d.version === DRAFT_VERSION &&
    typeof d.userId === "number" &&
    typeof d.quizId === "string" &&
    typeof d.attemptId === "number" &&
    typeof d.answers === "object" &&
    d.answers !== null &&
    !Array.isArray(d.answers) &&
    Object.values(d.answers).every((a) => typeof a === "string") &&
    typeof d.currentQuestionIndex === "number" &&
    typeof d.updatedAt === "number"
  );
}

export function buildDraftKey(userId: number, quizId: string, attemptId: number): string {
  return draftKey(userId, quizId, attemptId);
}

export function saveDraft(draft: QuizDraft): void {
  try {
    localStorage.setItem(
      draftKey(draft.userId, draft.quizId, draft.attemptId),
      JSON.stringify(draft),
    );
  } catch {
    // Quota exceeded / storage disabled — the quiz continues in memory.
  }
}

/**
 * Read and validate a draft. Returns null when missing, malformed,
 * stale, or belonging to a different identity — the caller must never
 * restore a draft it cannot fully trust.
 */
export function readDraft(
  userId: number,
  quizId: string,
  attemptId: number,
): QuizDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, quizId, attemptId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isQuizDraft(parsed)) return null;
    if (parsed.userId !== userId || parsed.quizId !== quizId || parsed.attemptId !== attemptId) {
      return null;
    }
    if (Date.now() - parsed.updatedAt > DRAFT_STALE_MS) {
      clearDraft(userId, quizId, attemptId);
      return null;
    }
    return parsed;
  } catch {
    return null; // corrupted JSON / storage unavailable
  }
}

export function clearDraft(userId: number, quizId: string, attemptId: number): void {
  try {
    localStorage.removeItem(draftKey(userId, quizId, attemptId));
  } catch {
    // Storage unavailable — nothing to clean.
  }
}

/**
 * Find and validate ANY draft for this (user, quiz) — used by the
 * recovery prompt before an attempt is active. Returns null when none
 * exists, is malformed, stale, or belongs to another identity.
 */
export function readDraftForQuiz(userId: number, quizId: string): QuizDraft | null {
  try {
    const prefix = `${DRAFT_PREFIX}${userId}:${quizId}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!isQuizDraft(parsed)) continue;
      if (parsed.userId !== userId || parsed.quizId !== quizId) continue;
      if (Date.now() - parsed.updatedAt > DRAFT_STALE_MS) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        continue;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
