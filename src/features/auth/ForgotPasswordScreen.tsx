/**
 * Forgot password (spec §9/§26). The backend response is generic by
 * design (anti-enumeration) — the success copy reflects that.
 */
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "./AuthShell";
import { forgotPassword } from "./auth.api";
import { describeError } from "@/lib/api/error-map";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    setState("submitting");
    try {
      await forgotPassword(email);
      setState("sent");
    } catch (err) {
      setError(describeError(err).title);
      setState("idle");
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send a reset link."
    >
      {state === "sent" ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success" title="Check your inbox.">
            If an account exists for this email, a password reset email has
            been sent. The link expires in 1 hour.
          </Alert>
          <Button variant="secondary" asChild>
            <Link to="/login">Back to sign in</Link>
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
            <Label htmlFor="forgot-email">Email address</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </div>

          {error ? <Alert tone="danger" title={error} /> : null}

          <Button type="submit" loading={state === "submitting"}>
            Send reset link
          </Button>

          <p className="text-center text-sm text-text-secondary">
            Remembered it?{" "}
            <Link to="/login" className="text-accent-ember underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
