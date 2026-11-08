/**
 * Route guards (frontend spec §5.3).
 *
 * RequireAuth: loading → branded skeleton (no login flash); network
 * error → retry screen (never a login redirect); 401 → /login with the
 * sanitized return path.
 * RedirectIfAuthed: keeps /login away from signed-in users.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./auth-context";
import { safeRedirectPath } from "@/lib/validate/redirect";

function AuthLoadingScreen() {
  useInterfaceLocale();
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label={uiText("authentication:loading_8f26c6")}>
      <div className="text-text-secondary">{uiText("authentication:loading_33ce41")}</div>
    </div>
  );
}

function AuthErrorScreen({ onRetry }: { onRetry: () => void }) {
  useInterfaceLocale();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
      <p className="text-text-primary">{uiText("authentication:we_couldn_t_reach_the_server_to_4ad27a")}</p>
      <button type="button" onClick={onRetry} className="rounded-md bg-accent-ember px-4 py-2 text-accent-on">{uiText("authentication:try_again_042c86")}</button>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  useInterfaceLocale();
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
  useInterfaceLocale();
  const { status } = useAuth();

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  // loading / unauthenticated / error all may stay on the public page.
  return <>{children}</>;
}
