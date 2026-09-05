/**
 * Plans page WITHOUT Stripe configuration (Stripe phase §18 fallback).
 *
 * When no publishable key exists, the page must never fake a payment:
 * in dev the dev-only switch is used; when even that is absent (a 404
 * from the server), the honest "billing coming" note appears.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { __setTestPlan, testUser } from "@/test/msw/handlers";

// Billing disabled: no publishable key in this environment.
vi.mock("@/lib/config/env", () => ({
  env: {
    apiBaseUrl: "",
    stripePublishableKey: undefined,
    contractCheck: false,
    isProduction: false,
  },
  isBillingEnabled: () => false,
  API_BASE: "/api/v1",
}));

import PlansPage from "./index";

const API = "*/api/v1";

function renderPlans() {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderAtRoute(<PlansPage />, "/plans");
}

describe("PlansPage (billing disabled)", () => {
  it("dev switch still works when billing isn't configured", async () => {
    __setTestPlan("survivor");
    const switchSpy = vi.fn();
    server.use(
      http.post(`${API}/subscription/dev-plan`, async ({ request }) => {
        const body = (await request.json()) as { plan_code?: string };
        switchSpy(body);
        if (body.plan_code === "operator") __setTestPlan("operator");
        return HttpResponse.json(null, { status: 200 });
      }),
    );
    renderPlans();
    await screen.findByRole("heading", { name: "Choose Your Plan" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /upgrade to operator/i }));

    await waitFor(() => { expect(switchSpy).toHaveBeenCalledOnce(); });
    expect(switchSpy.mock.calls[0]?.[0]).toEqual({ plan_code: "operator" });
  });

  it("never claims a payment — a missing dev endpoint renders the honest billing note", async () => {
    __setTestPlan("survivor");
    server.use(
      http.post(`${API}/subscription/dev-plan`, () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "Not found" } },
          { status: 404 },
        ),
      ),
    );
    renderPlans();
    await screen.findByRole("heading", { name: "Choose Your Plan" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /upgrade to operator/i }));

    await screen.findByText(/when billing goes live/i);
    expect(screen.getByText(/no payment is processed on this page/i)).toBeInTheDocument();
  });

  it("shows the disabled-billing footer", async () => {
    __setTestPlan("free");
    renderPlans();
    await screen.findByRole("heading", { name: "Choose Your Plan" });
    expect(screen.getByText(/billing is not configured/i)).toBeInTheDocument();
  });
});
