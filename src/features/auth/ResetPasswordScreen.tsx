/**
 * Reset password with the single-use token from the reset email
 * (spec §10/§26). Password policy checklist mirrors the backend rules;
 * the backend remains the authority.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "./AuthShell";
import { resetPassword } from "./auth.api";
import { PASSWORD_RULES, passwordMeetsPolicy } from "./password-policy";
import { describeError } from "@/lib/api/error-map";
import { ApiError } from "@/lib/api/errors";

export function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const passwordFeedback = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }));

  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(): Promise<void> {
    setFormError(null);
    setState("submitting");
    try {
      await resetPassword(token, password);
      setState("done");
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFormError("Your new password doesn't meet the requirements below.");
      } else {
        setFormError(describeError(err).title);
      }
      setState("idle");
    }
  }

  if (!token) {
    return (
      <AuthShell title="Reset your password" subtitle="This link isn't valid.">
        <Alert tone="warning" title="This password reset link is missing.">
          Request a new one from the sign-in page.
        </Alert>
        <div className="mt-4">
          <Button variant="secondary" asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (state === "done") {
    return (
      <AuthShell title="Reset your password" subtitle="All set.">
        <Alert tone="success" title="Your password has been reset.">
          All other sessions were signed out.
        </Alert>
        <div className="mt-4">
          <Button variant="secondary" asChild>
            <Link to="/login">Sign in with your new password</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You'll be signed out everywhere else after this."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <PasswordInput
          label="New password"
          name="new_password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
        />

        {password.length > 0 && !passwordMeetsPolicy(password) ? (
          <ul aria-label="Password requirements" className="flex flex-col gap-1">
            {passwordFeedback.map((rule) => (
              <li
                key={rule.id}
                className={rule.met ? "text-sm text-accent-ember" : "text-sm text-text-secondary"}
              >
                {rule.met ? "✓" : "○"} {rule.label}
              </li>
            ))}
          </ul>
        ) : null}

        <PasswordInput
          label="Confirm new password"
          name="confirm_password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); }}
          error={mismatch ? "Passwords don't match." : undefined}
        />

        {formError ? <Alert tone="danger" title={formError} /> : null}

        <Button
          type="submit"
          loading={state === "submitting"}
          disabled={!passwordMeetsPolicy(password) || mismatch}
        >
          Reset password
        </Button>

        <p className="text-center text-sm text-text-secondary">
          <Link to="/login" className="text-accent-ember underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
