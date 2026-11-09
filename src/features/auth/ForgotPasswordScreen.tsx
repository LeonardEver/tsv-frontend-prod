/**
 * Forgot password (spec §9/§26). The backend response is generic by
 * design (anti-enumeration) — the success copy reflects that.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "./AuthShell";
import { forgotPassword } from "./auth.api";
import { describeError } from "@/lib/api/error-map";

export function ForgotPasswordScreen() {
  useInterfaceLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<ReturnType<typeof describeError> | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    setState("submitting");
    try {
      await forgotPassword(email);
      setState("sent");
    } catch (err) {
      setError(describeError(err));
      setState("idle");
    }
  }

  return (
    <AuthShell
      title={uiText("authentication:reset_your_password_bf8804")}
      subtitle={uiText("authentication:enter_your_account_email_and_we_ll_f5a43e")}
    >
      {state === "sent" ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success" title={uiText("authentication:check_your_inbox_48f7d4")}>{uiText("authentication:if_an_account_exists_for_this_email_451fb8")}</Alert>
          <Button variant="secondary" asChild>
            <Link to="/login">{uiText("authentication:back_to_sign_in_4da821")}</Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="forgot-email">{uiText("authentication:email_address_c94d31")}</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </div>

          {error ? <Alert tone="danger" title={error.title} /> : null}

          <Button type="submit" loading={state === "submitting"}>{uiText("authentication:send_reset_link_b8ec55")}</Button>

          <p className="text-center text-sm text-text-secondary">{uiText("authentication:remembered_it_cf5779")}{" "}
            <Link to="/login" className="text-accent-ember underline underline-offset-2">{uiText("authentication:sign_in_ada2e9")}</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
