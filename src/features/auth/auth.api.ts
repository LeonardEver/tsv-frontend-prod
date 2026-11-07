/**
 * Auth API calls (frontend spec §6 + production auth phase).
 *
 * The backend is the ONLY authentication authority: the frontend calls
 * /auth/me, follows the backend-driven OIDC redirect, posts logout, and
 * submits the email/password credential flows. No tokens, no client-side
 * auth cryptography — password policy feedback is UI-only.
 */
import { request } from "@/lib/api/client";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal";
import type {
  CurrentUser,
  ForgotPasswordResponse,
  LoginResponse,
  RegisterResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
} from "@/lib/api/types";

export function fetchCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>("/auth/me");
}

export function logoutSession(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

// ── Email/password credentials ─────────────────────────────────────────────

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  country: string;
  password: string;
  accept_terms: boolean;
  accept_privacy: boolean;
  marketing_opt_in: boolean;
}

export function registerAccount(input: RegisterInput): Promise<RegisterResponse> {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: {
      ...input,
      // Legal acceptance is versioned — the user saw THESE versions
      // rendered on the form; the backend rejects stale acceptance.
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
    },
  });
}

export function loginAccount(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  return request<VerifyEmailResponse>("/auth/verify-email", {
    method: "POST",
    body: { token },
  });
}

export function resendVerificationEmail(email: string): Promise<ResendVerificationResponse> {
  return request<ResendVerificationResponse>("/auth/resend-verification", {
    method: "POST",
    body: { email },
  });
}

export function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  return request<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: { token, new_password: newPassword },
  });
}
