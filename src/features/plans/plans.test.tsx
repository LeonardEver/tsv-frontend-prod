/**
 * Plans page (Stripe phase §5–§6, §16, §18–§19).
 *
 * Billing ENABLED (publishable key present): plan changes go through
 * the server (POST /billing/checkout) — the client never supplies a
 * price id. Covers:
 *  - catalog + current plan identification
 *  - SURVIVOR → OPERATOR in-place upgrade (no checkout, no second
 *    subscription)
 *  - FREE → paid opens the EMBEDDED checkout (in-app, never a
 *    redirect)
 *  - downgrade = cancel at period end with explicit copy
 *  - return-URL entry polls the webhook-authoritative subscription
 *    (payment is never claimed before the server confirms the plan)
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { __setTestPlan, testUser } from "@/test/msw/handlers";
import PlansPage from "./index";

const API = "*/api/v1";

function renderPlans() {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderAtRoute(<PlansPage />, "/plans");
}

describe("PlansPage (billing enabled)", () => {
  it("renders the three tiers with pricing and the current plan identified", async () => {
    __setTestPlan("survivor");
    renderPlans();

    await screen.findByRole("heading", { name: "Choose Your Plan" });
    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Survivor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Operator" })).toBeInTheDocument();

    // USD currency formatting ($9.90 / $19.90), and the Free tier
    // renders a literal $0 — never a localized label.
    expect(screen.getAllByText(/\$9\.90/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\$19\.90/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$0").length).toBeGreaterThanOrEqual(1);

    // No Brazilian Real pricing anywhere on the page.
    expect(screen.queryByText(/R\$/)).toBeNull();
    expect(screen.queryByText(/brl/i)).toBeNull();

    // Exactly one current-plan card — identified on Survivor (the card
    // carries the "Current plan" Chip and the disabled CTA of the same
    // name; the other two cards carry neither).
    const survivorCard = screen.getByRole("heading", { name: "Survivor" }).closest("article");
    expect(survivorCard).not.toBeNull();
    expect(
      within(survivorCard as HTMLElement).getAllByText("Current plan").length,
    ).toBeGreaterThanOrEqual(1);
    for (const other of ["Free", "Operator"]) {
      const card = screen.getByRole("heading", { name: other }).closest("article");
      expect(within(card as HTMLElement).queryByText("Current plan")).toBeNull();
    }

    // The comparison communicates the matrix in product language.
    expect(screen.getAllByText(/field test before lesson/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/download field resources/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/community access/i).length).toBeGreaterThanOrEqual(1);
  });

  it("SURVIVOR → OPERATOR upgrades through the billing endpoint — no checkout", async () => {
    __setTestPlan("survivor");
    const checkoutSpy = vi.fn();
    server.use(
      http.post(`${API}/billing/checkout`, async ({ request }) => {
        const body = (await request.json()) as { plan?: string };
        checkoutSpy(body);
        if (body.plan === "operator") __setTestPlan("operator");
        return HttpResponse.json({
          result: "subscription_updated",
          subscription: {
            plan_code: "operator",
            plan_name: "Operator",
            price: 19.9,
            currency: "usd",
            billing_period: "month",
            status: "active",
            started_at: "2026-08-01T12:00:00Z",
            current_period_started_at: "2026-08-01T12:00:00Z",
            renews_at: "2026-09-01T12:00:00Z",
            ends_at: null,
            canceled_at: null,
            cancel_at_period_end: false,
            provider: "stripe",
            entitlements: {
              daily_lessons: null,
              daily_quizzes: null,
              resource_download: true,
              quiz_before_lesson: true,
              community: true,
            },
          },
        });
      }),
    );
    renderPlans();
    await screen.findByRole("heading", { name: "Choose Your Plan" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /upgrade to operator/i }));

    await waitFor(() => { expect(checkoutSpy).toHaveBeenCalledOnce(); });
    // The client sends ONLY the plan code — no price ids ever.
    expect(checkoutSpy.mock.calls[0]?.[0]).toEqual({ plan: "operator" });
    // After invalidation the current-plan badge moves to Operator.
    await waitFor(() => {
      const operatorCard = screen
        .getByRole("heading", { name: "Operator" })
        .closest("article");
      expect(operatorCard).not.toBeNull();
      expect(
        within(operatorCard as HTMLElement).getAllByText("Current plan").length,
      ).toBeGreaterThanOrEqual(1);
    });
    // The in-place upgrade never opens an embedded checkout.
    expect(screen.queryByRole("heading", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  it("FREE → paid opens the EMBEDDED checkout in-app (no redirect)", async () => {
    __setTestPlan("free");
    server.use(
      http.post(`${API}/billing/checkout`, () =>
        HttpResponse.json({ result: "checkout", client_secret: "cs_test_secret" }),
      ),
    );
    renderPlans();
    await screen.findByRole("heading", { name: "Choose Your Plan" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /choose survivor/i }));

    // The embedded checkout mounts as a native dialog — the user never
    // leaves the app (no checkout.stripe.com navigation).
    await screen.findByRole("heading", { name: "Subscribe" });
    expect(screen.getByText(/won't leave the academy/i)).toBeInTheDocument();
  });

  it("downgrade is cancellation at period end — the paid plan is kept, stated clearly", async () => {
    __setTestPlan("survivor");
    const cancelSpy = vi.fn();
    server.use(
      http.post(`${API}/billing/cancel`, () => {
        cancelSpy();
        return HttpResponse.json({
          plan_code: "survivor",
          plan_name: "Survivor",
          price: 9.9,
          currency: "usd",
          billing_period: "month",
          status: "active",
          started_at: "2026-08-01T12:00:00Z",
          current_period_started_at: "2026-08-01T12:00:00Z",
          renews_at: "2026-09-01T12:00:00Z",
          ends_at: "2026-09-01T12:00:00Z",
          canceled_at: null,
          cancel_at_period_end: true,
          provider: "stripe",
          entitlements: {
            daily_lessons: 10,
            daily_quizzes: 10,
            resource_download: true,
            quiz_before_lesson: true,
            community: true,
          },
        });
      }),
    );
    renderPlans();
    await screen.findByRole("heading", { name: "Choose Your Plan" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /downgrade to free/i }));

    // The dialog must spell out that access continues until period end.
    await screen.findByRole("heading", { name: /downgrade to the free plan/i });
    expect(screen.getByText(/stays active until/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel subscription/i }));
    await waitFor(() => { expect(cancelSpy).toHaveBeenCalledOnce(); });
  });

  it("return URL starts webhook-authoritative sync — never claims payment early", async () => {
    __setTestPlan("free");
    const user = userEvent.setup();
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
    const { unmount } = renderAtRoute(<PlansPage />, "/plans?checkout=cs_test_123");

    // Payment received — the plan is NOT claimed; sync is pending.
    await screen.findByText(/payment received — confirming your subscription/i);

    // The webhook lands: the subscription flips to Survivor — the UI
    // then confirms the plan.
    __setTestPlan("survivor");
    await screen.findByText(/plan is active/i, undefined, { timeout: 6_000 });
    expect(screen.getByText(/paid features are available right now/i)).toBeInTheDocument();

    // Unused user (mount flow) — keep linters quiet.
    void user;
    unmount();
  });

  it("shows today's usage with the Free-plan allowance and upgrade path", async () => {
    __setTestPlan("free");
    renderPlans();

    await screen.findByRole("heading", { name: "Choose Your Plan" });
    expect(screen.getByText(/today's learning/i)).toBeInTheDocument();
    // Free: 0/1 lessons and 0/1 quizzes.
    expect(screen.getAllByText(/0 \/ 1/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /upgrade plan/i })).toBeInTheDocument();
  });
});
