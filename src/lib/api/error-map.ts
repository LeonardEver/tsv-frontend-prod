/**
 * Error code → UI copy mapping (frontend spec §25).
 * Backend implementation details never reach the UI; `request_id` is
 * the only passthrough (support correlation). Callers switch on the
 * stable backend `code`, never on raw messages.
 */
import { tr as uiText } from "@/i18n";
import { ApiError, NetworkError, TimeoutError } from "./errors";

export interface ErrorCopy {
  title: string;
  description?: string;
  retryable: boolean;
}

export function describeError(err: unknown): ErrorCopy {
  if (err instanceof TimeoutError) {
    return { get title() { return uiText("errors:the_server_took_too_long_to_respond_a0504e"); }, retryable: true };
  }
  if (err instanceof NetworkError) {
    return {
      get title() { return uiText("errors:you_appear_to_be_offline_57d093"); },
      get description() { return uiText("errors:check_your_connection_and_try_again_563862"); },
      retryable: true,
    };
  }
  if (err instanceof ApiError) {
    switch (err.code) {
      case "NOT_FOUND":
        return { get title() { return uiText("errors:this_content_isn_t_available_0fe9d0"); }, retryable: false };
      // ── Production auth phase — credentials ──
      case "INVALID_CREDENTIALS":
        return {
          get title() { return uiText("errors:invalid_email_or_password_01126f"); },
          get description() { return uiText("errors:check_your_details_and_try_again_7fea7d"); },
          retryable: false,
        };
      case "EMAIL_NOT_VERIFIED":
        return {
          get title() { return uiText("errors:verify_your_email_first_6cd9fd"); },
          get description() { return uiText("errors:we_sent_a_verification_link_to_your_45642d"); },
          retryable: false,
        };
      case "EMAIL_ALREADY_REGISTERED":
        return {
          get title() { return uiText("errors:an_account_with_this_email_already_exists_b73ea4"); },
          get description() { return uiText("errors:sign_in_instead_or_use_a_different_fdfd5d"); },
          retryable: false,
        };
      case "VERIFICATION_TOKEN_EXPIRED":
        return {
          get title() { return uiText("errors:this_verification_link_has_expired_c7ada0"); },
          get description() { return uiText("errors:request_a_new_one_links_are_valid_2f1dc0"); },
          retryable: true,
        };
      case "VERIFICATION_TOKEN_USED":
        return {
          get title() { return uiText("errors:this_verification_link_was_already_used_0f32d9"); },
          get description() { return uiText("errors:your_email_is_verified_sign_in_to_686056"); },
          retryable: false,
        };
      case "VERIFICATION_TOKEN_INVALID":
        return {
          get title() { return uiText("errors:this_verification_link_is_invalid_6470ed"); },
          get description() { return uiText("errors:check_the_link_in_your_inbox_or_631dc1"); },
          retryable: true,
        };
      case "RESET_TOKEN_EXPIRED":
        return {
          get title() { return uiText("errors:this_password_reset_link_has_expired_62aec8"); },
          get description() { return uiText("errors:request_a_new_one_links_are_valid_c98d63"); },
          retryable: true,
        };
      case "RESET_TOKEN_USED":
        return {
          get title() { return uiText("errors:this_password_reset_link_was_already_used_cf35d2"); },
          get description() { return uiText("errors:request_a_new_link_to_reset_your_172970"); },
          retryable: true,
        };
      case "RESET_TOKEN_INVALID":
        return {
          get title() { return uiText("errors:this_password_reset_link_is_invalid_91d77e"); },
          get description() { return uiText("errors:request_a_new_link_to_reset_your_4f9d32"); },
          retryable: true,
        };
      case "LEGAL_TERMS_OUTDATED":
      case "LEGAL_PRIVACY_OUTDATED":
        return {
          get title() { return uiText("errors:our_legal_documents_have_been_updated_bba3a5"); },
          get description() { return uiText("errors:please_review_the_current_terms_of_service_aafeb3"); },
          retryable: false,
        };
      case "FORBIDDEN":
        return { get title() { return uiText("errors:you_don_t_have_access_to_this_6cf57c"); }, retryable: false };
      case "RATE_LIMITED":
        return {
          get title() { return uiText("errors:too_many_requests_8ae8c5"); },
          description: err.retryAfterSec
            ? `Try again in about ${Math.ceil(err.retryAfterSec)} seconds.`
            : "Please wait a moment and try again.",
          retryable: true,
        };
      // ── Phase 21 — plan limits and entitlements ──
      case "DAILY_LESSON_LIMIT_REACHED":
        return {
          get title() { return uiText("errors:daily_lesson_limit_reached_f7a955"); },
          get description() { return uiText("errors:your_limit_resets_tomorrow_upgrade_to_survivor_514a6d"); },
          retryable: false,
        };
      case "DAILY_QUIZ_LIMIT_REACHED":
        return {
          get title() { return uiText("errors:daily_quiz_limit_reached_c5d7b8"); },
          get description() { return uiText("errors:your_limit_resets_tomorrow_upgrade_to_survivor_514a6d"); },
          retryable: false,
        };
      case "QUIZ_LESSON_REQUIRED":
        return {
          get title() { return uiText("errors:complete_the_lesson_to_unlock_this_field_deebc6"); },
          get description() { return uiText("errors:on_the_free_plan_the_lesson_must_0587ba"); },
          retryable: false,
        };
      case "RESOURCE_DOWNLOAD_REQUIRES_PLAN":
        return {
          get title() { return uiText("errors:downloading_is_a_plan_feature_ad4064"); },
          get description() { return uiText("errors:viewing_is_free_downloads_are_included_in_895009"); },
          retryable: false,
        };
      case "COMMUNITY_REQUIRES_PLAN":
        return {
          get title() { return uiText("errors:community_is_a_plan_feature_98f610"); },
          get description() { return uiText("errors:community_access_is_included_in_survivor_and_f345a2"); },
          retryable: false,
        };
      case "COMMUNITY_RATE_LIMITED":
        return {
          get title() { return uiText("errors:you_re_posting_too_quickly_4a1d75"); },
          get description() { return uiText("errors:please_wait_a_few_minutes_before_posting_40dc19"); },
          retryable: true,
        };
      case "NOT_YOUR_POST":
      case "NOT_YOUR_COMMENT":
        return {
          get title() { return uiText("errors:you_can_only_modify_your_own_content_e877ba"); },
          retryable: false,
        };
      case "USERNAME_TAKEN":
        return {
          get title() { return uiText("errors:that_username_is_already_taken_ab9e54"); },
          get description() { return uiText("errors:try_a_different_one_b8d73e"); },
          retryable: false,
        };
      // ── Stripe phase — billing ──
      case "BILLING_NOT_CONFIGURED":
        return {
          get title() { return uiText("errors:billing_isn_t_available_right_now_65b0c6"); },
          get description() { return uiText("errors:payments_haven_t_been_configured_for_this_29b1c3"); },
          retryable: false,
        };
      case "BILLING_PRICE_UNAVAILABLE":
        return {
          get title() { return uiText("errors:this_plan_isn_t_available_for_purchase_bad572"); },
          get description() { return uiText("errors:please_try_again_later_60af87"); },
          retryable: false,
        };
      case "PLAN_ALREADY_ACTIVE":
        return {
          get title() { return uiText("errors:you_re_already_on_this_plan_e89d72"); },
          retryable: false,
        };
      case "NO_ACTIVE_SUBSCRIPTION":
        return {
          get title() { return uiText("errors:there_s_no_active_subscription_to_manage_5a5ac5"); },
          retryable: false,
        };
      case "UPGRADE_REQUIRES_PAYMENT_METHOD":
        return {
          get title() { return uiText("errors:add_a_payment_method_first_7d6bed"); },
          get description() { return uiText("errors:use_manage_billing_to_add_a_card_168c32"); },
          retryable: false,
        };
      case "BILLING_PROVIDER_ERROR":
        return {
          get title() { return uiText("errors:the_payment_provider_couldn_t_complete_the_37ee07"); },
          get description() { return uiText("errors:please_try_again_in_a_moment_a917db"); },
          retryable: true,
        };
      default:
        return { get title() { return uiText("errors:something_went_wrong_bee54c"); }, get description() { return uiText("errors:please_try_again_83a6fd"); }, retryable: true };
    }
  }
  return { get title() { return uiText("errors:something_went_wrong_bee54c"); }, retryable: false };
}
