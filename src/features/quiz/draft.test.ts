/**
 * Draft persistence lifecycle (Phase 13 §14–§16, §50).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAFT_PREFIX,
  DRAFT_STALE_MS,
  DRAFT_VERSION,
  clearDraft,
  readDraft,
  readDraftForQuiz,
  saveDraft,
  type QuizDraft,
} from "./draft";

function makeDraft(overrides: Partial<QuizDraft> = {}): QuizDraft {
  return {
    version: DRAFT_VERSION,
    userId: 1,
    quizId: "WAT-boiling-Q01",
    attemptId: 7,
    answers: { q01: "C" },
    currentQuestionIndex: 0,
    updatedAt: Date.now(),
    ...overrides,
  };
}

/** Local key builder — keeps the lint rule's namespace guarantee. */
function draftKey(userId: number, quizId: string, attemptId: number): string {
  return `${DRAFT_PREFIX}${userId}:${quizId}:${attemptId}`;
}

describe("quiz draft persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("persists and restores a valid draft under the quiz-draft namespace", () => {
    const draft = makeDraft();
    saveDraft(draft);

    const key = localStorage.key(0) ?? "";
    expect(key.startsWith(DRAFT_PREFIX)).toBe(true);

    const restored = readDraft(1, "WAT-boiling-Q01", 7);
    expect(restored).toEqual(draft);
  });

  it("rejects drafts from another user, quiz or attempt", () => {
    const draft = makeDraft();
    saveDraft(draft);

    expect(readDraft(2, "WAT-boiling-Q01", 7)).toBeNull();
    expect(readDraft(1, "FIR-safety-Q01", 7)).toBeNull();
    expect(readDraft(1, "WAT-boiling-Q01", 8)).toBeNull();
  });

  it("rejects malformed and version-mismatched drafts", () => {
    localStorage.setItem(
      draftKey(1, "WAT-boiling-Q01", 7),
      JSON.stringify({ version: 999, userId: 1, quizId: "WAT-boiling-Q01", attemptId: 7 }),
    );
    expect(readDraft(1, "WAT-boiling-Q01", 7)).toBeNull();

    localStorage.setItem(draftKey(1, "WAT-boiling-Q01", 8), "{not json");
    expect(readDraft(1, "WAT-boiling-Q01", 8)).toBeNull();
  });

  it("discards stale drafts on read", () => {
    const stale = makeDraft({ attemptId: 9, updatedAt: Date.now() - DRAFT_STALE_MS - 1000 });
    saveDraft(stale);
    expect(readDraft(1, "WAT-boiling-Q01", 9)).toBeNull();
  });

  it("survives localStorage failures without crashing", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });

    expect(() => { saveDraft(makeDraft()); }).not.toThrow();
    expect(readDraft(1, "WAT-boiling-Q01", 7)).toBeNull();
    expect(readDraftForQuiz(1, "WAT-boiling-Q01")).toBeNull();

    setSpy.mockRestore();
    getSpy.mockRestore();
  });

  it("clears only the targeted draft", () => {
    saveDraft(makeDraft({ attemptId: 7 }));
    saveDraft(makeDraft({ attemptId: 8 }));
    clearDraft(1, "WAT-boiling-Q01", 7);
    expect(readDraft(1, "WAT-boiling-Q01", 7)).toBeNull();
    expect(readDraft(1, "WAT-boiling-Q01", 8)).not.toBeNull();
  });

  it("finds a valid draft for recovery and ignores foreign ones", () => {
    saveDraft(makeDraft({ attemptId: 11 }));
    localStorage.setItem(
      draftKey(2, "WAT-boiling-Q01", 12),
      JSON.stringify(makeDraft({ userId: 2, attemptId: 12 })),
    );

    const found = readDraftForQuiz(1, "WAT-boiling-Q01");
    expect(found?.attemptId).toBe(11);

    expect(readDraftForQuiz(3, "WAT-boiling-Q01")).toBeNull();
  });

  it("never stores correctness data — drafts contain answers only", () => {
    const draft = makeDraft();
    saveDraft(draft);
    const raw = localStorage.getItem(draftKey(1, "WAT-boiling-Q01", 7)) ?? "";
    expect(raw).not.toContain("correct_answer");
    expect(raw).not.toContain("is_correct");
    expect(raw).not.toContain("token");
  });
});
