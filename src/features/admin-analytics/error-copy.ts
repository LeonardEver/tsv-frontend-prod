/**
 * Admin-analytics wording for the shared error surface.
 *
 * `ErrorState` renders copy from `lib/api/error-map`, which is the public
 * SaaS voice and stays English. This module supplies a translated
 * alternative for the admin console only, passed to `ErrorState` as its
 * optional `explain` prop — no public route is touched.
 *
 * The public map's catalogue is login, billing and entitlement copy that
 * cannot occur on an admin read; the codes an analytics request can
 * actually return are the ones handled here. Anything else falls through
 * to the public map, which is English rather than misleading.
 */
import { ApiError, NetworkError, TimeoutError } from "@/lib/api/errors";
import { describeError, type ErrorCopy } from "@/lib/api/error-map";
import type { Tr } from "./i18n";

export function adminErrorCopy(error: unknown, { t, tf }: Pick<Tr, "t" | "tf">): ErrorCopy {
  if (error instanceof TimeoutError) {
    return { title: t("errors.timeout"), retryable: true };
  }
  if (error instanceof NetworkError) {
    return {
      title: t("errors.offlineTitle"),
      description: t("errors.offlineDescription"),
      retryable: true,
    };
  }
  if (error instanceof ApiError) {
    switch (error.code) {
      case "FORBIDDEN":
        return { title: t("errors.forbidden"), retryable: false };
      case "NOT_FOUND":
        return { title: t("errors.notFound"), retryable: false };
      case "RATE_LIMITED":
        return {
          title: t("errors.rateLimitedTitle"),
          description:
            error.retryAfterSec === undefined
              ? t("errors.rateLimitedWait")
              : tf("errors.rateLimitedRetryAfter", { seconds: Math.ceil(error.retryAfterSec) }),
          retryable: true,
        };
      default:
        return {
          title: t("errors.genericTitle"),
          description: t("errors.genericDescription"),
          retryable: true,
        };
    }
  }
  if (error instanceof Error) {
    return { title: t("errors.genericTitle"), retryable: false };
  }
  // Unknown thrown value: the public map handles it, in English.
  return describeError(error);
}
