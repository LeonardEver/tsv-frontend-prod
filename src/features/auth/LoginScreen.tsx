/**
 * Login screen (Phase 23 + production auth phase).
 *
 * The backend owns the entire OIDC flow: "Continue with Google" performs
 * a FULL NAVIGATION to /api/v1/auth/login (the server 302s to the
 * provider), and the backend's callback redirects back with a fresh
 * session.
 *
 * Email/password sign-in runs through the same session architecture:
 * POST /auth/login sets the same HttpOnly session cookie, then the
 * bootstrap query is refreshed and the app navigates to the redirect
 * target (sanitized, root-relative only).
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BrandMark } from "@/components/layout/BrandMark";
import { Eyebrow } from "@/components/sa/primitives";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { API_BASE } from "@/lib/config/env";
import { safeRedirectPath } from "@/lib/validate/redirect";
import { describeError } from "@/lib/api/error-map";
import { ApiError } from "@/lib/api/errors";
import { loginAccount } from "./auth.api";
import { useAuth } from "./auth-context";
import loginHero from "@/assets/login-hero.jpg";
import { AuthLanguageChoice } from "@/i18n/AuthLanguageChoice";
import { confirmLocaleChoice } from "@/i18n";

export function LoginScreen() {
  useInterfaceLocale();
  const [params] = useSearchParams();
  const redirectTo = safeRedirectPath(params.get("redirect_to"));
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReturnType<typeof describeError> | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const loginUrl = `${API_BASE}/auth/login?redirect_to=${encodeURIComponent(redirectTo)}`;

  async function submit(): Promise<void> {
    confirmLocaleChoice();
    setError(null);
    setNeedsVerification(false);
    setSubmitting(true);
    try {
      await loginAccount(email, password);
      // Session cookie is set — re-run the bootstrap and land where the
      // user was headed (RedirectIfAuthed takes over as a backstop).
      refresh();
      void navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      } else {
        setError(describeError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="topo grain relative flex flex-col justify-center overflow-y-auto px-6 py-14 sm:px-12 lg:px-16">
        <ThemeToggle className="absolute top-4 right-4 z-10" />

        <div className="relative w-full max-w-md">
          <BrandMark />
          <Eyebrow className="mt-10">Survival Academy</Eyebrow>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-wide uppercase sm:text-5xl">{uiText("authentication:practical_survival_c825a9")}<br />{uiText("authentication:preparedness_and_30cd0b")}<br />{uiText("authentication:self_reliance_44c71e")}</h1>
          <p className="mt-4 text-sm text-muted-foreground">{uiText("authentication:field_manuals_missions_and_field_tests_built_0b4504")}</p>

          <AuthLanguageChoice />
          <a
            href={loginUrl}
            onClick={() => { confirmLocaleChoice(); }}
            className="glow-ember mt-8 flex min-h-13 w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.63 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.68 0 2.8.72 3.45 1.33l2.35-2.27C16.4 3.86 14.4 3 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.6-.1-1.4-.3-2.1Z"
              />
            </svg>{uiText("authentication:continue_with_google_ccc5b0")}</a>

          <div className="mt-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-default" />
            <span className="font-mono text-[11px] tracking-widest text-text-disabled uppercase">{uiText("authentication:or_use_email_be1bca")}</span>
            <span className="h-px flex-1 bg-border-default" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            noValidate
            className="mt-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="login-email">{uiText("authentication:email_address_c94d31")}</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <PasswordInput
                label={uiText("authentication:password_8be3c9")}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
              />
              <p className="text-right text-sm">
                <Link
                  to="/forgot-password"
                  className="text-accent-ember underline underline-offset-2"
                >{uiText("authentication:forgot_password_4c29f7")}</Link>
              </p>
            </div>

            {needsVerification ? (
              <Alert tone="warning" title={uiText("authentication:verify_your_email_before_signing_in_dbe562")}>
                <Link
                  to={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="underline underline-offset-2"
                >{uiText("authentication:resend_the_verification_email_b45640")}</Link>
              </Alert>
            ) : null}
            {error ? <Alert tone="danger" title={error.title} /> : null}

            <Button type="submit" loading={submitting} className="w-full">{uiText("authentication:sign_in_ada2e9")}</Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">{uiText("authentication:new_to_survival_academy_8eb698")}{" "}
            <Link to="/register" className="text-accent-ember underline underline-offset-2">{uiText("authentication:create_an_account_3f4f54")}</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img
          src={loginHero}
          alt={uiText("authentication:illuminated_tent_on_a_mountain_ridge_at_28faa8")}
          width={1400}
          height={1600}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-transparent to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-background to-transparent p-12">
          <p className="font-mono text-[11px] tracking-[0.3em] text-primary uppercase">{uiText("authentication:expedition_begins_at_base_camp_6edccf")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{uiText("authentication:water_fire_shelter_food_agriculture_foraging_medical_76bb5d")}</p>
        </div>
      </div>
    </div>
  );
}
