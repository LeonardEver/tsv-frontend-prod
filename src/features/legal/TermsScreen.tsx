/**
 * Terms of Service (versioned — see src/lib/legal.ts).
 *
 * Registration records the accepted VERSION + timestamp server-side; the
 * backend rejects acceptance of outdated versions. When this document
 * changes, bump TERMS_VERSION in src/lib/legal.ts AND the backend's
 * TERMS_VERSION together.
 */
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

export function TermsScreen() {
  return (
    <div className="min-h-screen bg-bg-surface">
      <header className="border-b border-border-default">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/login" className="text-sm text-accent-ember underline underline-offset-2">
            ← Back to sign in
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-[11px] tracking-[0.3em] text-accent-ember uppercase">
          Survival Academy
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-wide uppercase">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Version {TERMS_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <p className="mt-8 text-sm leading-relaxed text-text-secondary">
          These Terms of Service govern your use of Survival Academy and The
          Survival Vault (the “Service”), operated by the Survival Academy
          team (“we”, “us”). By creating an account or using the Service you
          agree to these terms.
        </p>

        {SECTION_TITLES.map((title) => (
          <section key={title} className="mt-10">
            <h2 className="font-display text-lg font-semibold tracking-wide uppercase">
              {title}
            </h2>
            <LegalSectionBody title={title} />
          </section>
        ))}

        <p className="mt-12 border-t border-border-default pt-6 text-xs leading-relaxed text-text-disabled">
          Questions about these terms? Contact us at legal@thesurvivalvault.com.
        </p>
      </main>
    </div>
  );
}

/** Section body copy — kept in a map so the document reads as one unit. */
function LegalSectionBody({ title }: { title: string }) {
  const body: Record<string, string> = {
    "1. The service":
      "The Service is an educational platform offering survival, preparedness and self-reliance learning content, including lessons, quizzes, downloadable resources and community features. The Service is provided for general educational purposes only. It does not constitute professional, medical, legal, or safety advice, and it does not replace proper training or professional judgment in real emergencies.",
    "2. Accounts":
      "You must be at least 16 years old to create an account. You must provide accurate registration information and keep it current. You are responsible for safeguarding your login credentials and for all activity on your account. Notify us immediately of any unauthorized use. One account per person; you may create an account using email/password or a supported third-party sign-in such as Google.",
    "3. Content and learning materials":
      "Learning content is provided as-is for educational purposes. We may update, add or remove content at any time. Resource downloads may be subject to your plan. User-generated community content is the responsibility of its author and does not represent our views.",
    "4. Acceptable use":
      "You agree not to: misuse the Service, attempt to gain unauthorized access, interfere with the Service's operation, scrape or bulk-download content, resell or redistribute content outside the Service, upload unlawful or harmful community content, or use the Service to violate any law. We may suspend or terminate accounts that violate these rules.",
    "5. Subscriptions and payments":
      "Paid plans are billed through our payment provider. Subscription fees are charged in advance for each billing period. You may cancel at any time; access continues until the end of the current period. Price and plan changes are announced before they take effect. All payments are non-refundable except where required by law.",
    "6. Intellectual property":
      "All learning content, design, and software in the Service are owned by us or our licensors and are protected by intellectual property laws. Your account grants you a personal, non-transferable, revocable license to access the Service for your own learning. You retain ownership of your community posts, and you grant us a license to host and display them within the Service.",
    "7. Disclaimers":
      "THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. SURVIVAL AND EMERGENCY SITUATIONS ARE INHERENTLY DANGEROUS; SKILLS SHOWN IN LEARNING CONTENT MAY NOT BE SUFFICIENT IN ALL CIRCUMSTANCES. YOU USE THE CONTENT AT YOUR OWN RISK.",
    "8. Limitation of liability":
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES, INCLUDING PERSONAL INJURY OR PROPERTY DAMAGE ARISING FROM USE OF THE SERVICE. OUR TOTAL LIABILITY IS LIMITED TO THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.",
    "9. Changes to the service":
      "We may modify, suspend or discontinue any part of the Service at any time. We will make reasonable efforts to notify you of material changes that affect your access.",
    "10. Changes to these terms":
      "We may update these Terms from time to time. Material changes are announced before they take effect, and continued use of the Service after the effective date constitutes acceptance of the updated terms. Your account records the version you accepted.",
    "11. Termination":
      "You may delete your account at any time from your profile. We may suspend or terminate accounts that violate these terms, without refund where the violation is material. Sections that by their nature should survive termination will survive.",
    "12. Governing law":
      "These terms are governed by the laws of the jurisdiction where the operator is established, without regard to conflict-of-law principles, except where consumer-protection law of your country of residence applies mandatorily.",
  };
  return (
    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{body[title]}</p>
  );
}
