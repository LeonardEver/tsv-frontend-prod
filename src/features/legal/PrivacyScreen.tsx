/**
 * Privacy Policy (versioned — see src/lib/legal.ts).
 *
 * Registration records the acknowledged VERSION + timestamp server-side;
 * the backend rejects acknowledgement of outdated versions. When this
 * document changes, bump PRIVACY_VERSION in src/lib/legal.ts AND the
 * backend's PRIVACY_VERSION together.
 */
import { Link } from "react-router";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PRIVACY_VERSION, LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

const SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: "1. Who we are",
    body: "Survival Academy operates The Survival Vault, an educational platform for survival, preparedness and self-reliance skills. This policy explains what personal data we collect, why we collect it, and your rights. Questions: privacy@thesurvivalvault.com.",
  },
  {
    title: "2. Data we collect",
    body: "Account data you provide at registration: first name, last name, email address, date of birth, country/region, and a password (stored only as a secure one-way hash). If you sign in with Google, we receive your Google account email address, name and profile data through the OAuth flow. Usage data: learning progress, quiz attempts, achievements, plan and subscription state. Technical data: IP address, browser type, device information and security logs, kept for security and abuse prevention.",
  },
  {
    title: "3. Legal acceptance and marketing consent",
    body: "When you create an account you accept our Terms of Service and acknowledge this Privacy Policy. We record which version you accepted and when. Marketing communications are strictly optional and are only sent when you explicitly opt in; you can withdraw consent at any time and it never affects your access to the Service.",
  },
  {
    title: "4. How we use your data",
    body: "We use your data to: provide and personalize the Service (progress, achievements, plans), secure the Service (session management, rate limiting, abuse prevention), process payments through our payment provider, send transactional emails (email verification, password reset) and, only with your consent, send marketing updates. We do not sell personal data.",
  },
  {
    title: "5. Legal bases",
    body: "Where GDPR applies we process your data on these bases: performance of the contract (providing the Service), legitimate interests (security, fraud prevention, service improvement), consent (marketing communications), and legal obligations (accounting and regulatory requirements).",
  },
  {
    title: "6. Data sharing",
    body: "We share data only with processors who operate the Service: hosting and database providers, the email provider (Resend) for transactional messages, the payment provider (Stripe) for billing, and Google for sign-in. Processors act on our instructions under data-processing terms. We disclose data to authorities only when legally required.",
  },
  {
    title: "7. Data retention",
    body: "Account data is kept while your account is active. When you delete your account, your data is deleted within a reasonable period except where retention is required by law (e.g. payment records). Security logs are retained for a limited period and then deleted.",
  },
  {
    title: "8. International transfers",
    body: "The Service is hosted internationally. Where your data is transferred outside your region, we rely on applicable safeguards such as standard contractual clauses and adequacy decisions.",
  },
  {
    title: "9. Security",
    body: "Passwords are stored as one-way cryptographic hashes — we never store plaintext passwords. Sessions are server-side and invalidated on password reset or account deletion. Access to production infrastructure is restricted and logged.",
  },
  {
    title: "10. Your rights",
    body: "Depending on your jurisdiction, you may have the right to access, correct, delete, export or restrict processing of your personal data, and to object to or withdraw consent for processing. You can manage most data directly in your profile, including deleting your account. To exercise other rights, contact privacy@thesurvivalvault.com.",
  },
  {
    title: "11. Children",
    body: "The Service is not directed at children. You must be at least 16 years old to create an account. If you believe a child has provided us personal data, contact us and we will delete it.",
  },
  {
    title: "12. Cookies and similar technologies",
    body: "The Service uses a single essential session cookie (HttpOnly, SameSite) to keep you signed in — it is required for the Service to function. We do not use third-party advertising trackers. If we introduce analytics or preferences cookies, we will update this policy.",
  },
  {
    title: "13. Changes to this policy",
    body: "We may update this policy from time to time. Material changes are announced before they take effect. Your account records which version you acknowledged.",
  },
];

export function PrivacyScreen() {
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
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Version {PRIVACY_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <p className="mt-8 text-sm leading-relaxed text-text-secondary">
          This policy explains how Survival Academy and The Survival Vault
          collect, use and protect your personal data, and the choices you
          have.
        </p>

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

        <p className="mt-12 border-t border-border-default pt-6 text-xs leading-relaxed text-text-disabled">
          Questions about this policy or your data? Contact privacy@thesurvivalvault.com.
        </p>
      </main>
    </div>
  );
}
