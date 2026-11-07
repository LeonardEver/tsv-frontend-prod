/**
 * Auth context + hook (split from the provider component so react-refresh
 * stays clean and consumers can import the hook without the component).
 */
import { createContext, useContext } from "react";
import type { ClientError } from "@/lib/api/errors";
import type { CurrentUser } from "@/lib/api/types";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Underlying bootstrap error when status === "error". */
  error: ClientError | null;
  /** Fire-and-forget bootstrap re-run (e.g., after the login redirect). */
  refresh: () => void;
  /** POST /auth/logout, clear ALL cached server state, return to login. */
  logout: () => Promise<void>;
  /** True when the backend explicitly rejected the session (401). */
  isUnauthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
