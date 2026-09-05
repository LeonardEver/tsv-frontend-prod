/**
 * Error code → UI copy mapping (frontend spec §25).
 * Backend implementation details never reach the UI; `request_id` is
 * the only passthrough (support correlation). Callers switch on the
 * stable backend `code`, never on raw messages.
 */
import { ApiError, NetworkError, TimeoutError } from "./errors";

export interface ErrorCopy {
  title: string;
  description?: string;
  retryable: boolean;
}

export function describeError(err: unknown): ErrorCopy {
  if (err instanceof TimeoutError) {
    return { title: "The server took too long to respond.", retryable: true };
  }
  if (err instanceof NetworkError) {
    return {
      title: "You appear to be offline.",
      description: "Check your connection and try again.",
      retryable: true,
    };
  }
  if (err instanceof ApiError) {
    switch (err.code) {
      case "NOT_FOUND":
        return { title: "This content isn't available.", retryable: false };
      case "FORBIDDEN":
        return { title: "You don't have access to this content.", retryable: false };
      case "RATE_LIMITED":
        return {
          title: "Too many requests.",
          description: err.retryAfterSec
            ? `Try again in about ${Math.ceil(err.retryAfterSec)} seconds.`
            : "Please wait a moment and try again.",
          retryable: true,
        };
      // ── Phase 21 — plan limits and entitlements ──
      case "DAILY_LESSON_LIMIT_REACHED":
        return {
          title: "Daily lesson limit reached",
          description:
            "Your limit resets tomorrow. Upgrade to Survivor for 10 lessons and quizzes per day.",
          retryable: false,
        };
      case "DAILY_QUIZ_LIMIT_REACHED":
        return {
          title: "Daily quiz limit reached",
          description:
            "Your limit resets tomorrow. Upgrade to Survivor for 10 lessons and quizzes per day.",
          retryable: false,
        };
      case "QUIZ_LESSON_REQUIRED":
        return {
          title: "Complete the lesson to unlock this field test",
          description:
            "On the Free plan the lesson must be completed first. Survivor and Operator can test themselves any time.",
          retryable: false,
        };
      case "RESOURCE_DOWNLOAD_REQUIRES_PLAN":
        return {
          title: "Downloading is a plan feature",
          description: "Viewing is free — downloads are included in Survivor and Operator.",
          retryable: false,
        };
      case "COMMUNITY_REQUIRES_PLAN":
        return {
          title: "Community is a plan feature",
          description: "Community access is included in Survivor and Operator.",
          retryable: false,
        };
      case "COMMUNITY_RATE_LIMITED":
        return {
          title: "You're posting too quickly",
          description: "Please wait a few minutes before posting again.",
          retryable: true,
        };
      case "NOT_YOUR_POST":
      case "NOT_YOUR_COMMENT":
        return {
          title: "You can only modify your own content",
          retryable: false,
        };
      case "USERNAME_TAKEN":
        return {
          title: "That username is already taken",
          description: "Try a different one.",
          retryable: false,
        };
      // ── Stripe phase — billing ──
      case "BILLING_NOT_CONFIGURED":
        return {
          title: "Billing isn't available right now",
          description: "Payments haven't been configured for this environment.",
          retryable: false,
        };
      case "BILLING_PRICE_UNAVAILABLE":
        return {
          title: "This plan isn't available for purchase right now",
          description: "Please try again later.",
          retryable: false,
        };
      case "PLAN_ALREADY_ACTIVE":
        return {
          title: "You're already on this plan",
          retryable: false,
        };
      case "NO_ACTIVE_SUBSCRIPTION":
        return {
          title: "There's no active subscription to manage",
          retryable: false,
        };
      case "UPGRADE_REQUIRES_PAYMENT_METHOD":
        return {
          title: "Add a payment method first",
          description: "Use “Manage billing” to add a card, then change plans.",
          retryable: false,
        };
      case "BILLING_PROVIDER_ERROR":
        return {
          title: "The payment provider couldn't complete the request",
          description: "Please try again in a moment.",
          retryable: true,
        };
      default:
        return { title: "Something went wrong.", description: "Please try again.", retryable: true };
    }
  }
  return { title: "Something went wrong.", retryable: false };
}
