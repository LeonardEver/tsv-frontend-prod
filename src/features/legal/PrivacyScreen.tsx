/**
 * Privacy Policy (versioned — see src/lib/legal.ts).
 *
 * Registration records the acknowledged VERSION + timestamp server-side;
 * the backend rejects acknowledgement of outdated versions. When this
 * document changes, bump PRIVACY_VERSION in src/lib/legal.ts AND the
 * backend's PRIVACY_VERSION together.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Link } from "react-router";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PRIVACY_VERSION, LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

const SECTIONS: Array<{ title: string; body: string }> = [
  {
    get title() { return uiText("public:1_who_we_are_2e8946"); },
    get body() { return uiText("public:copy_000321174918"); },
  },
  {
    get title() { return uiText("public:2_data_we_collect_618ac1"); },
    get body() { return uiText("public:copy_312899726b27"); },
  },
  {
    get title() { return uiText("public:3_legal_acceptance_and_marketing_consent_f52008"); },
    get body() { return uiText("public:copy_6309c798a91d"); },
  },
  {
    get title() { return uiText("public:4_how_we_use_your_data_9bd972"); },
    get body() { return uiText("public:copy_4c5585227be7"); },
  },
  {
    get title() { return uiText("public:5_legal_bases_ec09b0"); },
    get body() { return uiText("public:copy_4da12b1dd3d4"); },
  },
  {
    get title() { return uiText("public:6_data_sharing_dcd687"); },
    get body() { return uiText("public:copy_21b990a776ae"); },
  },
  {
    get title() { return uiText("public:7_data_retention_00ccd4"); },
    get body() { return uiText("public:copy_020845104b22"); },
  },
  {
    get title() { return uiText("public:8_international_transfers_169597"); },
    get body() { return uiText("public:copy_d53ca3a18283"); },
  },
  {
    get title() { return uiText("public:9_security_8d2f3f"); },
    get body() { return uiText("public:copy_1c028062b6f3"); },
  },
  {
    get title() { return uiText("public:10_your_rights_bbbcde"); },
    get body() { return uiText("public:copy_17e3f06175a3"); },
  },
  {
    get title() { return uiText("public:11_children_60e790"); },
    get body() { return uiText("public:copy_6baadfd61f77"); },
  },
  {
    get title() { return uiText("public:12_cookies_and_similar_technologies_c771e9"); },
    get body() { return uiText("public:copy_aba1d88b0c43"); },
  },
  {
    get title() { return uiText("public:13_changes_to_this_policy_06de82"); },
    get body() { return uiText("public:copy_4ca40e6535d7"); },
  },
];

export function PrivacyScreen() {
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
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-wide uppercase">{uiText("public:privacy_policy_9db108")}</h1>
        <p className="mt-3 text-sm text-text-secondary">{uiText("public:version_value_effective_value_ae1f8c", { value0: uiValue(PRIVACY_VERSION), value1: uiValue(LEGAL_EFFECTIVE_DATE) })}</p>

        <p className="mt-8 text-sm leading-relaxed text-text-secondary">{uiText("public:this_policy_explains_how_survival_academy_and_fa4d4b")}</p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="font-display text-lg font-semibold tracking-wide uppercase">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {section.body}
            </p>
          </section>
        ))}

        <p className="mt-12 border-t border-border-default pt-6 text-xs leading-relaxed text-text-disabled">{uiText("public:questions_about_this_policy_or_your_data_e6ff1a")}</p>
      </main>
    </div>
  );
}
