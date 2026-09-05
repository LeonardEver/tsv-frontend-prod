/**
 * Login screen (Phase 23) — the Lovable reference `src/routes/login.tsx`
 * is the visual source of truth: split screen, `topo` + `grain` left
 * panel with the brand and a single Google CTA, full-bleed hero image on
 * the right.
 *
 * The backend owns the entire OIDC flow: the button performs a FULL
 * NAVIGATION to /api/v1/auth/login (the server 302s to the provider),
 * and the backend's callback redirects back with a fresh session.
 * Nothing about authentication behavior changed — only the stage.
 */
import { useSearchParams } from "react-router";
import { BrandMark } from "@/components/layout/BrandMark";
import { Eyebrow } from "@/components/sa/primitives";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { API_BASE } from "@/lib/config/env";
import { safeRedirectPath } from "@/lib/validate/redirect";
import loginHero from "@/assets/login-hero.jpg";

export function LoginScreen() {
  const [params] = useSearchParams();
  const redirectTo = safeRedirectPath(params.get("redirect_to"));

  const loginUrl = `${API_BASE}/auth/login?redirect_to=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="topo grain relative flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-16">
        <ThemeToggle className="absolute top-4 right-4 z-10" />

        <div className="relative w-full max-w-md">
          <BrandMark />
          <Eyebrow className="mt-12">Survival Academy</Eyebrow>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-wide uppercase sm:text-5xl">
            Practical survival,
            <br />
            preparedness and
            <br />
            self-reliance.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Field manuals, missions and field tests built for people who want usable skills — not
            trivia. Accounts are provisioned automatically on first sign-in.
          </p>

          <a
            href={loginUrl}
            className="glow-ember mt-9 flex min-h-13 w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.63 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.68 0 2.8.72 3.45 1.33l2.35-2.27C16.4 3.86 14.4 3 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.6-.1-1.4-.3-2.1Z"
              />
            </svg>
            Continue with Google
          </a>

          <p className="mt-6 font-mono text-[11px] leading-relaxed tracking-wide text-muted-foreground">
            No password. No registration form. Your account is created on first sign-in.
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img
          src={loginHero}
          alt="Illuminated tent on a mountain ridge at blue hour"
          width={1400}
          height={1600}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-transparent to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-background to-transparent p-12">
          <p className="font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
            Expedition begins at base camp
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Water · Fire · Shelter · Food · Agriculture · Foraging · Medical · Navigation · Energy
          </p>
        </div>
      </div>
    </div>
  );
}
