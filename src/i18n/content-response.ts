import type { Locale } from "./config";
import { ApiError } from "@/lib/api/errors";

const CONTENT_RESPONSE = /^\/(?:categories(?:\/[^/?]+)?|modules(?:\/[^/?]+)?|lessons\/[^/?]+|quizzes\/[^/?]+(?:\/attempts\/\d+(?:\/answers)?)?|resources\/[^/?]+|gamification\/achievements|notifications)(?:\?|$)/;

/** Refuse stale servers/caches that claim success but return foreign content.
 * PDFs use a different authenticated download route and keep English bytes. */
export function assertContentLocale(path: string, data: unknown, locale: Locale, requestId?: string): void {
  if (locale === "en" || !CONTENT_RESPONSE.test(path)) return;
  const metadata = data && typeof data === "object" && "localization" in data ? data.localization : null;
  if (metadata && typeof metadata === "object" && "content_locale" in metadata && metadata.content_locale === locale && "fallback" in metadata && metadata.fallback === false && "missing_count" in metadata && metadata.missing_count === 0) return;
  throw new ApiError({ status: 503, code: "CONTENT_TRANSLATION_UNAVAILABLE", message: "Content locale mismatch", requestId });
}
