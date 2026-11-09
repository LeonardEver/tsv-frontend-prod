/**
 * Registration screen (spec §2/§15) — the complete account model.
 *
 * Required: first name, last name, email, date of birth, country/region,
 * password (policy checklist), Terms acceptance, Privacy acknowledgement.
 * Optional: marketing opt-in (NEVER preselected, never combined with the
 * legal checkboxes).
 *
 * The backend is the authority for every policy; the checklist and date
 * bounds here are feedback only and mirror the server rules.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { useState } from "react";
import { Trans } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { API_BASE } from "@/lib/config/env";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { Alert } from "@/components/ui/Alert";
import { registerAccount } from "./auth.api";
import { PASSWORD_RULES, passwordMeetsPolicy } from "./password-policy";
import { AuthShell } from "./AuthShell";
import { describeError } from "@/lib/api/error-map";
import { ApiError } from "@/lib/api/errors";
import { fieldError } from "@/i18n/field-errors";
import { AuthLanguageChoice } from "@/i18n/AuthLanguageChoice";
import { confirmLocaleChoice, getLocale } from "@/i18n";

const MINIMUM_AGE = 16; // mirrors backend MINIMUM_REGISTRATION_AGE
const MAXIMUM_AGE = 120;

function isoYearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** Map backend field-level issues (error.details) to a field→message
 * record. */
function issuesByPath(err: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!(err instanceof ApiError)) return result;
  for (const issue of err.details) {
    if (issue.path && !result[issue.path]) {
      result[issue.path] = fieldError(issue.message, issue.path);
    }
  }
  return result;
}

export function RegisterScreen() {
  useInterfaceLocale();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<ReturnType<typeof describeError> | null>(null);
  const [fieldErrorSource, setFieldErrorSource] = useState<unknown>(null);
  const fieldErrors = issuesByPath(fieldErrorSource);

  const minDate = isoYearsAgo(MAXIMUM_AGE);
  const maxDate = isoYearsAgo(MINIMUM_AGE);

  async function submit(): Promise<void> {
    confirmLocaleChoice();
    setFormError(null);
    setFieldErrorSource(null);
    setSubmitting(true);
    try {
      await registerAccount({
        first_name: firstName,
        last_name: lastName,
        email,
        date_of_birth: dateOfBirth,
        country,
        password,
        accept_terms: acceptTerms,
        accept_privacy: acceptPrivacy,
        marketing_opt_in: marketingOptIn,
        preferred_language: getLocale(),
      });
      // Account created — unverified until the email link is opened.
      void navigate(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFieldErrorSource(err);
      } else {
        const copy = describeError(err);
        setFormError(copy);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const passwordFeedback = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }));

  return (
    <AuthShell
      title={uiText("authentication:create_your_account_4046b5")}
      subtitle={uiText("authentication:field_manuals_missions_and_field_tests_start_c9c53e")}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <AuthLanguageChoice />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="register-first-name">{uiText("authentication:first_name_7e568a")}</Label>
            <Input
              id="register-first-name"
              name="first_name"
              autoComplete="given-name"
              required
              maxLength={80}
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); }}
              error={fieldErrors.first_name}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="register-last-name">{uiText("authentication:last_name_adec36")}</Label>
            <Input
              id="register-last-name"
              name="last_name"
              autoComplete="family-name"
              required
              maxLength={80}
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); }}
              error={fieldErrors.last_name}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="register-email">{uiText("authentication:email_address_c94d31")}</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            error={fieldErrors.email}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="register-dob">{uiText("authentication:date_of_birth_951842")}</Label>
            <Input
              id="register-dob"
              type="date"
              name="date_of_birth"
              autoComplete="bday"
              required
              min={minDate}
              max={maxDate}
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); }}
              error={fieldErrors.date_of_birth}
            />
          </div>

          <CountrySelect
            label={uiText("authentication:country_region_e9ffe6")}
            name="country"
            required
            value={country}
            onChange={(e) => { setCountry(e.target.value); }}
            error={fieldErrors.country}
          />
        </div>

        <div className="flex flex-col gap-1">
          <PasswordInput
            label={uiText("authentication:password_8be3c9")}
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            error={fieldErrors.password}
          />
          {password.length > 0 && !passwordMeetsPolicy(password) ? (
            <ul aria-label={uiText("authentication:password_requirements_a1b02d")} className="mt-1 flex flex-col gap-1">
              {passwordFeedback.map((rule) => (
                <li
                  key={rule.id}
                  className={
                    rule.met ? "text-sm text-accent-ember" : "text-sm text-text-secondary"
                  }
                >
                  {rule.met ? "✓" : "○"} {rule.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="accept_terms"
              required
              checked={acceptTerms}
              onChange={(e) => { setAcceptTerms(e.target.checked); }}
              className="mt-0.5 size-4 accent-accent-ember"
            />
            <span><Trans ns="authentication" i18nKey="termsAgreement" components={{ policy: <Link to="/terms" className="text-accent-ember underline underline-offset-2" /> }} /></span>
          </label>

          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="accept_privacy"
              required
              checked={acceptPrivacy}
              onChange={(e) => { setAcceptPrivacy(e.target.checked); }}
              className="mt-0.5 size-4 accent-accent-ember"
            />
            <span><Trans ns="authentication" i18nKey="privacyAgreement" components={{ policy: <Link to="/privacy" className="text-accent-ember underline underline-offset-2" /> }} /></span>
          </label>

          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="marketing_opt_in"
              checked={marketingOptIn}
              onChange={(e) => { setMarketingOptIn(e.target.checked); }}
              className="mt-0.5 size-4 accent-accent-ember"
            />
            <span>{uiText("authentication:send_me_occasional_survival_academy_updates_new_770448")}</span>
          </label>
        </div>

        {(fieldErrors.accept_terms || fieldErrors.accept_privacy) && (
          <p role="alert" className="text-sm text-danger-blood">
            {fieldErrors.accept_terms ?? fieldErrors.accept_privacy}
          </p>
        )}

        {formError ? <Alert tone="danger" title={formError.title} /> : null}

        <Button type="submit" loading={submitting} className="w-full">{uiText("authentication:create_account_aaf374")}</Button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-border-default" />
          <span className="font-mono text-[11px] tracking-widest text-text-disabled uppercase">{uiText("authentication:or_175835")}</span>
          <span className="h-px flex-1 bg-border-default" />
        </div>

        <a
          href={`${API_BASE}/auth/login`}
          onClick={() => { confirmLocaleChoice(); }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border-default bg-bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-surface/80"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.63 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.68 0 2.8.72 3.45 1.33l2.35-2.27C16.4 3.86 14.4 3 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.6-.1-1.4-.3-2.1Z"
            />
          </svg>{uiText("authentication:continue_with_google_ccc5b0")}</a>

        <p className="text-center text-sm text-text-secondary">{uiText("authentication:already_have_an_account_855903")}{" "}
          <Link to="/login" className="text-accent-ember underline underline-offset-2">{uiText("authentication:sign_in_ada2e9")}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
