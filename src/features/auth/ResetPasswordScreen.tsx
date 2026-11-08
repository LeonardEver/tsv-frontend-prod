/**
 * Reset password with the single-use token from the reset email
 * (spec §10/§26). Password policy checklist mirrors the backend rules;
 * the backend remains the authority.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
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
  useInterfaceLocale();
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
        setFormError(uiText("common:passwordPolicy"));
      } else {
        setFormError(describeError(err).title);
      }
      setState("idle");
    }
  }

  if (!token) {
    return (
      <AuthShell title={uiText("authentication:reset_your_password_bf8804")} subtitle={uiText("authentication:this_link_isn_t_valid_7b2b19")}>
        <Alert tone="warning" title={uiText("authentication:this_password_reset_link_is_missing_9235b9")}>{uiText("authentication:request_a_new_one_from_the_sign_1ec496")}</Alert>
        <div className="mt-4">
          <Button variant="secondary" asChild>
            <Link to="/forgot-password">{uiText("authentication:request_a_new_link_5590df")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (state === "done") {
    return (
      <AuthShell title={uiText("authentication:reset_your_password_bf8804")} subtitle={uiText("authentication:all_set_4be154")}>
        <Alert tone="success" title={uiText("authentication:your_password_has_been_reset_3e0347")}>{uiText("authentication:all_other_sessions_were_signed_out_fea8a5")}</Alert>
        <div className="mt-4">
          <Button variant="secondary" asChild>
            <Link to="/login">{uiText("authentication:sign_in_with_your_new_password_6732e9")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={uiText("authentication:choose_a_new_password_3f657f")}
      subtitle={uiText("authentication:you_ll_be_signed_out_everywhere_else_34082d")}
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
          label={uiText("authentication:new_password_d850ee")}
          name="new_password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
        />

        {password.length > 0 && !passwordMeetsPolicy(password) ? (
          <ul aria-label={uiText("authentication:password_requirements_a1b02d")} className="flex flex-col gap-1">
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
          label={uiText("authentication:confirm_new_password_f85039")}
          name="confirm_password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); }}
          error={mismatch ? uiText("common:passwordMismatch") : undefined}
        />

        {formError ? <Alert tone="danger" title={formError} /> : null}

        <Button
          type="submit"
          loading={state === "submitting"}
          disabled={!passwordMeetsPolicy(password) || mismatch}
        >{uiText("authentication:reset_password_5c4bc9")}</Button>

        <p className="text-center text-sm text-text-secondary">
          <Link to="/login" className="text-accent-ember underline underline-offset-2">{uiText("authentication:back_to_sign_in_4da821")}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
