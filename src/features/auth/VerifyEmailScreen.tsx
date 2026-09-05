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
      title="Verify your email"
      subtitle="One more step before base camp opens."
    >
      <div className="flex flex-col gap-4">
        {status === "success" ? (
          <Alert tone="success" title="Your email address is verified.">
            Your account is ready — sign in to continue.
          </Alert>
        ) : null}
        {status === "expired" ? (
          <Alert tone="warning" title="This verification link has expired.">
            Request a new one below.
          </Alert>
        ) : null}
        {status === "used" ? (
          <Alert tone="info" title="This verification link was already used.">
            If your email is verified, sign in to continue — otherwise request
            a new link below.
          </Alert>
        ) : null}
        {status === "invalid" ? (
          <Alert tone="warning" title="This verification link is invalid.">
            Request a new one below.
          </Alert>
        ) : null}
        {status === "error" ? (
          <Alert tone="danger" title="Something went wrong.">
            Please try again.
          </Alert>
        ) : null}
        {status === "verifying" ? (
          <p className="text-sm text-text-secondary">
            Verifying your email address…
          </p>
        ) : null}

        {sent && status === "idle" ? (
          <Alert tone="info" title="Check your inbox.">
            We sent a verification email to{" "}
            <strong>{email || "your email address"}</strong>. Open the link to
            activate your account. It expires in 24 hours.
          </Alert>
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
                <Label htmlFor="verify-email-address">Email address</Label>
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
                <Alert tone="success" title="Check your inbox.">
                  If a verification is pending for this email address, a new
                  email has been sent.
                </Alert>
              ) : null}
              {resendError ? <Alert tone="danger" title={resendError} /> : null}

              <Button type="submit" loading={resendState === "submitting"}>
                Resend verification email
              </Button>
            </form>
          ) : null}

          <Button variant="secondary" asChild>
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
