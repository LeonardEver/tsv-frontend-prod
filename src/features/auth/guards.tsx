/**
 * Route guards (frontend spec §5.3).
 *
 * RequireAuth: loading → branded skeleton (no login flash); network
 * error → retry screen (never a login redirect); 401 → /login with the
 * sanitized return path.
 * RedirectIfAuthed: keeps /login away from signed-in users.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./auth-context";
import { safeRedirectPath } from "@/lib/validate/redirect";

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <div className="text-text-secondary">Loading…</div>
    </div>
  );
}

function AuthErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
      <p className="text-text-primary">We couldn't reach the server to verify your session.</p>
      <button type="button" onClick={onRetry} className="rounded-md bg-accent-ember px-4 py-2 text-accent-on">
        Try again
      </button>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, refresh } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthLoadingScreen />;
  if (status === "error") return <AuthErrorScreen onRetry={refresh} />;
  if (status === "unauthenticated") {
    const from = safeRedirectPath(location.pathname + location.search);
    return <Navigate to={`/login?redirect_to=${encodeURIComponent(from)}`} replace />;
  }
  return <>{children}</>;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  // loading / unauthenticated / error all may stay on the public page.
  return <>{children}</>;
}
