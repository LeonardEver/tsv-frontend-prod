/**
 * Terms of Service (versioned — see src/lib/legal.ts).
 *
 * Registration records the accepted VERSION + timestamp server-side; the
 * backend rejects acceptance of outdated versions. When this document
 * changes, bump TERMS_VERSION in src/lib/legal.ts AND the backend's
 * TERMS_VERSION together.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Link } from "react-router";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TERMS_VERSION, LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

const SECTION_TITLES = [
  "1. The service",
  "2. Accounts",
  "3. Content and learning materials",
  "4. Acceptable use",
  "5. Subscriptions and payments",
  "6. Intellectual property",
  "7. Disclaimers",
  "8. Limitation of liability",
  "9. Changes to the service",
  "10. Changes to these terms",
  "11. Termination",
  "12. Governing law",
] as const;

const LEGAL_HEADINGS: Record<string, () => string> = {
  "1. The service": () => uiText("public:copy_5b9dd13447a6"),
  "2. Accounts": () => uiText("public:copy_389c59f845cb"),
  "3. Content and learning materials": () => uiText("public:copy_92f41f21a10d"),
  "4. Acceptable use": () => uiText("public:copy_d702c60fe4d5"),
  "5. Subscriptions and payments": () => uiText("public:copy_ac81a6204e3c"),
  "6. Intellectual property": () => uiText("public:copy_6b64ac8feb92"),
  "7. Disclaimers": () => uiText("public:copy_a771ed4bb92f"),
  "8. Limitation of liability": () => uiText("public:copy_4c44ccc0baf9"),
  "9. Changes to the service": () => uiText("public:copy_6ca85f3c083a"),
  "10. Changes to these terms": () => uiText("public:copy_04c84b0e07c0"),
  "11. Termination": () => uiText("public:copy_b0d740521734"),
  "12. Governing law": () => uiText("public:copy_170a2ace2b0a"),
};

export function TermsScreen() {
  useInterfaceLocale();
  return (
    <div className="min-h-screen bg-bg-surface">
      <header className="border-b border-border-default">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/login" className="text-sm text-accent-ember underline underline-offset-2">{uiText("public:back_to_sign_in_ee1c57")}</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-[11px] tracking-[0.3em] text-accent-ember uppercase">
          Survival Academy
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-wide uppercase">{uiText("public:terms_of_service_0c8a9a")}</h1>
        <p className="mt-3 text-sm text-text-secondary">{uiText("public:version_value_effective_value_ae1f8c", { value0: uiValue(TERMS_VERSION), value1: uiValue(LEGAL_EFFECTIVE_DATE) })}</p>

        <p className="mt-8 text-sm leading-relaxed text-text-secondary">{uiText("public:these_terms_of_service_govern_your_use_a6c5fb")}</p>

        {SECTION_TITLES.map((title) => (
          <section key={title} className="mt-10">
            <h2 className="font-display text-lg font-semibold tracking-wide uppercase">
              {LEGAL_HEADINGS[title]?.() ?? title}
            </h2>
            <LegalSectionBody title={title} />
          </section>
        ))}

        <p className="mt-12 border-t border-border-default pt-6 text-xs leading-relaxed text-text-disabled">{uiText("public:questions_about_these_terms_contact_us_at_b7f758")}</p>
      </main>
    </div>
  );
}

/** Section body copy — kept in a map so the document reads as one unit. */
function LegalSectionBody({ title }: { title: string }) {
  useInterfaceLocale();
  const body: Record<string, string> = {
    "1. The service":
      uiText("public:copy_3053d6cdb318"),
    "2. Accounts":
      uiText("public:copy_d5a03aaead4a"),
    "3. Content and learning materials":
      uiText("public:copy_8cc3993eefbf"),
    "4. Acceptable use":
      uiText("public:copy_470737df9628"),
    "5. Subscriptions and payments":
      uiText("public:copy_ffc1006ab254"),
    "6. Intellectual property":
      uiText("public:copy_8f02393e148d"),
    "7. Disclaimers":
      uiText("public:copy_ce35195d5c44"),
    "8. Limitation of liability":
      uiText("public:copy_958781fcee59"),
    "9. Changes to the service":
      uiText("public:copy_533715a45227"),
    "10. Changes to these terms":
      uiText("public:copy_7a26b63168ef"),
    "11. Termination":
      uiText("public:copy_aa8d46321787"),
    "12. Governing law":
      uiText("public:copy_e04424509d91"),
  };
  return (
    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{body[title]}</p>
  );
}
