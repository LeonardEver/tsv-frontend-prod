/**
 * Webhook-sync polling (Stripe phase §19).
 *
 * The plan change is authoritative ONLY when the server (webhook) has
 * recorded it. These tests pin the poller's behavior with a fake
 * QueryClient: resolved on plan match, false on timeout, resilient to
 * transient fetch errors.
 */
import { describe, expect, it, vi } from "vitest";
import { waitForPlanChange, SYNC_POLL_INTERVAL_MS } from "./sync";

function fakeQueryClient(responses: Array<{ plan_code: string } | Error>) {
  let call = 0;
  const fetchQuery = vi.fn(() => {
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (response instanceof Error) throw response;
    return response;
  });
  return { fetchQuery, client: { fetchQuery } as never };
}

describe("waitForPlanChange", () => {
  it("resolves true when the webhook lands and the plan matches", async () => {
    const { client, fetchQuery } = fakeQueryClient([
      { plan_code: "free" },
      { plan_code: "free" },
      { plan_code: "survivor" },
    ]);
    const result = await waitForPlanChange(client, 7, "survivor", 10_000);
    expect(result).toBe(true);
    expect(fetchQuery).toHaveBeenCalledTimes(3);
  });

  it("resolves true on ANY paid plan when no target is given (return-URL case)", async () => {
    const { client } = fakeQueryClient([
      { plan_code: "free" },
      { plan_code: "operator" },
    ]);
    const result = await waitForPlanChange(client, 7, undefined, 10_000);
    expect(result).toBe(true);
  });

  it("returns false after the timeout without a plan change", async () => {
    vi.useFakeTimers();
    try {
      const { client } = fakeQueryClient([{ plan_code: "free" }]);
      const pending = waitForPlanChange(client, 7, "survivor", 4_000);
      await vi.advanceTimersByTimeAsync(4_000 + SYNC_POLL_INTERVAL_MS);
      expect(await pending).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps polling through transient fetch errors", async () => {
    vi.useFakeTimers();
    try {
      const { client } = fakeQueryClient([
        new Error("network"),
        new Error("network"),
        { plan_code: "survivor" },
      ]);
      const pending = waitForPlanChange(client, 7, "survivor", 10_000);
      await vi.advanceTimersByTimeAsync(3 * SYNC_POLL_INTERVAL_MS + 100);
      expect(await pending).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
