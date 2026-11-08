/**
 * Email verification screen (spec §6/§7/§26).
 *
 * Entry points:
 *   - /verify-email?email=…&sent=1      after registration (check inbox)
 *   - /verify-email?token=…             link from the verification email
 *     (auto-submits the token to the backend)
 *   - /verify-email?status=success|expired|used|invalid
 *     after the backend GET redirect
 *
 * Also hosts the "resend verification" form. The backend answers
 * resends generically (anti-enumeration) — the UI copy reflects that.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "./AuthShell";
import { resendVerificationEmail, verifyEmail } from "./auth.api";
import { describeError } from "@/lib/api/error-map";

type VerifyStatus =
  | "idle"
  | "verifying"
  | "success"
  | "expired"
  | "used"
  | "invalid"
  | "error";

export function VerifyEmailScreen() {
  useInterfaceLocale();
  const [params] = useSearchParams();
  const token = params.get("token");
  const emailParam = params.get("email");
  const statusParam = params.get("status");
  const sent = params.get("sent") === "1";

  const [status, setStatus] = useState<VerifyStatus>(
    sent ? "idle" : statusParam === "success" ? "success" : statusParam === "expired" ? "expired" : statusParam === "used" ? "used" : statusParam === "invalid" ? "invalid" : token ? "verifying" : "idle",
  );
  const [email, setEmail] = useState(emailParam ?? "");
  const [resendState, setResendState] = useState<"idle" | "submitting" | "sent">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const startedVerification = useRef(false);

  // Auto-consume the token from the email link (exactly once).
  useEffect(() => {
    if (!token || startedVerification.current) return;
    startedVerification.current = true;
    setStatus("verifying");
    verifyEmail(token)
      .then(() => { setStatus("success"); })
      .catch(() => { setStatus("invalid"); });
  }, [token]);

  async function resend(): Promise<void> {
    setResendError(null);
    setResendState("submitting");
    try {
      await resendVerificationEmail(email);
      setResendState("sent");
    } catch (err) {
      setResendError(describeError(err).title);
      setResendState("idle");
    }
  }

  return (
    <AuthShell
      title={uiText("authentication:verify_your_email_84fdc7")}
      subtitle={uiText("authentication:one_more_step_before_base_camp_opens_3a7359")}
    >
      <div className="flex flex-col gap-4">
        {status === "success" ? (
          <Alert tone="success" title={uiText("authentication:your_email_address_is_verified_b90c84")}>{uiText("authentication:your_account_is_ready_sign_in_to_a0314c")}</Alert>
        ) : null}
        {status === "expired" ? (
          <Alert tone="warning" title={uiText("authentication:this_verification_link_has_expired_ad5b83")}>{uiText("authentication:request_a_new_one_below_f858f6")}</Alert>
        ) : null}
        {status === "used" ? (
          <Alert tone="info" title={uiText("authentication:this_verification_link_was_already_used_ddea16")}>{uiText("authentication:if_your_email_is_verified_sign_in_d8c38a")}</Alert>
        ) : null}
        {status === "invalid" ? (
          <Alert tone="warning" title={uiText("authentication:this_verification_link_is_invalid_3de944")}>{uiText("authentication:request_a_new_one_below_f858f6")}</Alert>
        ) : null}
        {status === "error" ? (
          <Alert tone="danger" title={uiText("authentication:something_went_wrong_bee54c")}>{uiText("authentication:please_try_again_83a6fd")}</Alert>
        ) : null}
        {status === "verifying" ? (
          <p className="text-sm text-text-secondary">{uiText("authentication:verifying_your_email_address_ddee19")}</p>
        ) : null}

        {sent && status === "idle" ? (
          <Alert tone="info" title={uiText("authentication:check_your_inbox_48f7d4")}>{uiText("authentication:we_sent_a_verification_email_to_e294fe")}{" "}
            <strong>{email || uiText("authentication:your_email_address_13b99c")}</strong>{uiText("authentication:open_the_link_to_activate_your_account_9397eb")}</Alert>
        ) : null}

        <div className="mt-2 flex flex-col gap-4">
          {status !== "success" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void resend();
              }}
              noValidate
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="verify-email-address">{uiText("authentication:email_address_c94d31")}</Label>
                <Input
                  id="verify-email-address"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
                />
              </div>

              {resendState === "sent" ? (
                <Alert tone="success" title={uiText("authentication:check_your_inbox_48f7d4")}>{uiText("authentication:if_a_verification_is_pending_for_this_655450")}</Alert>
              ) : null}
              {resendError ? <Alert tone="danger" title={resendError} /> : null}

              <Button type="submit" loading={resendState === "submitting"}>{uiText("authentication:resend_verification_email_0ca4ac")}</Button>
            </form>
          ) : null}

          <Button variant="secondary" asChild>
            <Link to="/login">{uiText("authentication:back_to_sign_in_4da821")}</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
