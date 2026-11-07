/**
 * Credential auth screens (production auth phase) — registration,
 * verification, forgot/reset password, and email/password login.
 *
 * The backend is the authority for every policy: these tests assert the
 * UI contract (fields, feedback, states, links) and that backend error
 * codes drive the right copy — never that the UI "validates" security.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";
import { AuthProvider } from "./use-auth";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { VerifyEmailScreen } from "./VerifyEmailScreen";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { ResetPasswordScreen } from "./ResetPasswordScreen";
import { TermsScreen } from "@/features/legal/TermsScreen";
import { PrivacyScreen } from "@/features/legal/PrivacyScreen";

const API = "*/api/v1";

function renderWithAuth(ui: React.ReactElement, route: string) {
  const router = createMemoryRouter([{ path: "*", element: ui }], {
    initialEntries: [route],
  });
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}

async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First name"), "Ada");
  await user.type(screen.getByLabelText("Last name"), "Lovelace");
  await user.type(screen.getByLabelText("Email address"), "ada@example.com");
  await user.type(screen.getByLabelText("Date of birth"), "1990-01-15");
  await user.selectOptions(screen.getByLabelText("Country / Region"), "US");
  await user.type(screen.getByLabelText("Password"), "Str0ng!Password#2026");
}

// ═══════════════════════════════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════════════════════════════

describe("RegisterScreen", () => {
  it("renders every required field, legal links and the optional marketing checkbox", () => {
    renderWithAuth(<RegisterScreen />, "/register");

    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth")).toBeInTheDocument();
    expect(screen.getByLabelText("Country / Region")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Terms of Service/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Privacy Policy/ })).toHaveAttribute("href", "/privacy");

    const marketing = screen.getByRole("checkbox", {
      name: /occasional Survival Academy updates/i,
    });
    expect(marketing).not.toBeChecked();

    // Terms/privacy are SEPARATE checkboxes from marketing (spec §15).
    expect(screen.getByRole("checkbox", { name: /agree to the Terms/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /acknowledge the Privacy/ })).toBeInTheDocument();

    // Google sign-in stays available alongside email/password.
    expect(screen.getByRole("link", { name: /Continue with Google/ })).toBeInTheDocument();
  });

  it("shows the password requirement checklist as the user types", async () => {
    const user = userEvent.setup();
    renderWithAuth(<RegisterScreen />, "/register");

    await user.type(screen.getByLabelText("Password"), "abc");

    const list = screen.getByLabelText("Password requirements");
    expect(within(list).getByText(/At least 12 characters/)).toHaveTextContent("○");
    expect(within(list).getByText(/One lowercase letter/)).toHaveTextContent("✓");

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "Str0ng!Password#2026");
    expect(screen.queryByLabelText("Password requirements")).not.toBeInTheDocument();
  });

  it("navigates to the verification screen after a successful registration", async () => {
    const user = userEvent.setup();
    const { router } = renderWithAuth(<RegisterScreen />, "/register");

    await fillRegisterForm(user);
    await user.click(screen.getByRole("checkbox", { name: /agree to the Terms/ }));
    await user.click(screen.getByRole("checkbox", { name: /acknowledge the Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/verify-email");
    });
    expect(router.state.location.search).toContain("sent=1");
  });

  it("maps backend field issues onto the matching inputs", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid registration details",
              details: {
                issues: [
                  { path: "first_name", message: "This field is required." },
                  { path: "password", message: "Password must include at least one number." },
                ],
              },
              request_id: "test-req-1",
            },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithAuth(<RegisterScreen />, "/register");

    await fillRegisterForm(user);
    await user.click(screen.getByRole("checkbox", { name: /agree to the Terms/ }));
    await user.click(screen.getByRole("checkbox", { name: /acknowledge the Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("This field is required.")).toBeInTheDocument();
    });
    expect(screen.getByText("Password must include at least one number.")).toBeInTheDocument();
  });

  it("surfaces a duplicate-email conflict", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          {
            error: {
              code: "EMAIL_ALREADY_REGISTERED",
              message: "An account with this email address already exists.",
              request_id: "test-req-1",
            },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithAuth(<RegisterScreen />, "/register");

    await fillRegisterForm(user);
    await user.click(screen.getByRole("checkbox", { name: /agree to the Terms/ }));
    await user.click(screen.getByRole("checkbox", { name: /acknowledge the Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("An account with this email already exists")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Login
// ═══════════════════════════════════════════════════════════════════════════

describe("LoginScreen", () => {
  it("keeps Google sign-in and adds the email/password form with links", () => {
    renderWithAuth(<LoginScreen />, "/login");

    expect(screen.getByRole("link", { name: /Continue with Google/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/v1/auth/login"),
    );
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create an account/ })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: /Forgot password/ })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("shows the invalid-credentials message on a failed login", async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginScreen />, "/login");

    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Wrong!Password#2026");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });

  it("offers to resend verification when the account is unverified", async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginScreen />, "/login");

    await user.type(screen.getByLabelText("Email address"), "unverified@example.com");
    await user.type(screen.getByLabelText("Password"), "Str0ng!Password#2026");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Verify your email before signing in.")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /Resend the verification email/ })).toHaveAttribute(
      "href",
      "/verify-email?email=unverified%40example.com",
    );
  });

  it("navigates to the sanitized redirect target after a successful login", async () => {
    const user = userEvent.setup();
    const { router } = renderWithAuth(<LoginScreen />, "/login?redirect_to=%2Fdashboard");

    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Str0ng!Password#2026");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Verification
// ═══════════════════════════════════════════════════════════════════════════

describe("VerifyEmailScreen", () => {
  it("shows the check-your-inbox state after registration", () => {
    renderWithAuth(
      <VerifyEmailScreen />,
      "/verify-email?email=ada@example.com&sent=1",
    );
    expect(screen.getByText("Check your inbox.")).toBeInTheDocument();
    expect(screen.getByText(/ada@example\.com/)).toBeInTheDocument();
  });

  it("auto-consumes a valid token and shows success", async () => {
    renderWithAuth(<VerifyEmailScreen />, "/verify-email?token=good-token");
    await waitFor(() => {
      expect(screen.getByText("Your email address is verified.")).toBeInTheDocument();
    });
  });

  it("shows the invalid state when the backend rejects the token", async () => {
    server.use(
      http.post(`${API}/auth/verify-email`, () =>
        HttpResponse.json(
          {
            error: {
              code: "VERIFICATION_TOKEN_EXPIRED",
              message: "This verification link has expired.",
              request_id: "test-req-1",
            },
          },
          { status: 410 },
        ),
      ),
    );
    renderWithAuth(<VerifyEmailScreen />, "/verify-email?token=bad-token");
    await waitFor(() => {
      expect(screen.getByText("This verification link is invalid.")).toBeInTheDocument();
    });
  });

  it("sends a resend request and confirms generically", async () => {
    const user = userEvent.setup();
    renderWithAuth(<VerifyEmailScreen />, "/verify-email");

    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(screen.getByText("Check your inbox.")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/If a verification is pending for this email address/i),
    ).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Forgot / reset password
// ═══════════════════════════════════════════════════════════════════════════

describe("ForgotPasswordScreen", () => {
  it("confirms with the generic anti-enumeration message", async () => {
    const user = userEvent.setup();
    renderWithAuth(<ForgotPasswordScreen />, "/forgot-password");

    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(
        screen.getByText(/If an account exists for this email/i),
      ).toBeInTheDocument();
    });
  });
});

describe("ResetPasswordScreen", () => {
  it("warns when the reset link has no token", () => {
    renderWithAuth(<ResetPasswordScreen />, "/reset-password");
    expect(screen.getByText("This password reset link is missing.")).toBeInTheDocument();
  });

  it("gates submission on the password policy and a matching confirmation", async () => {
    const user = userEvent.setup();
    renderWithAuth(<ResetPasswordScreen />, "/reset-password?token=reset-token");

    const submit = screen.getByRole("button", { name: "Reset password" });
    expect(submit).toBeDisabled();

    // Policy met → enabled even before confirming.
    const newPassword = screen.getByLabelText("New password");
    await user.type(newPassword, "Str0ng!Password#2026");
    expect(submit).toBeEnabled();

    // Mismatched confirmation → disabled again with feedback.
    await user.type(screen.getByLabelText("Confirm new password"), "N0pe!Password#2026");
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("Confirm new password"), "Str0ng!Password#2026");
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => {
      expect(screen.getByText("Your password has been reset.")).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Legal pages
// ═══════════════════════════════════════════════════════════════════════════

describe("legal pages", () => {
  it("renders the Terms of Service with its version", () => {
    renderWithAuth(<TermsScreen />, "/terms");
    expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByText(/Version 1\.0/)).toBeInTheDocument();
  });

  it("renders the Privacy Policy with its version", () => {
    renderWithAuth(<PrivacyScreen />, "/privacy");
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(/Version 1\.0/)).toBeInTheDocument();
  });
});
