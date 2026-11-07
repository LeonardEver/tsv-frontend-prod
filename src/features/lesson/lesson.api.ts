/**
 * Lesson API (typed against the backend OpenAPI response schemas).
 */
import { request } from "@/lib/api/client";
import type { LessonResponse } from "@/lib/api/types";

export function fetchLesson(lessonId: string): Promise<LessonResponse> {
  return request<LessonResponse>(`/lessons/${lessonId}`);
}

export interface CompleteLessonInput {
  lessonId: string;
  lastPosition: number;
}

export interface CompleteLessonResponse {
  lesson_id: string;
  completed: boolean;
  completed_at: string;
}

/**
 * Idempotent completion (backend upsert — safe to retry). The mutation
 * carries no Idempotency-Key because the backend endpoint is naturally
 * idempotent (INSERT ... ON CONFLICT merge).
 */
export function completeLesson(input: CompleteLessonInput): Promise<CompleteLessonResponse> {
  return request<CompleteLessonResponse>(`/lessons/${input.lessonId}/complete`, {
    method: "POST",
    body: { last_position: input.lastPosition },
  });
}
