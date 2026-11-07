/**
 * Resource journeys (Phase 16 §22):
 *
 *   R-01  login → module → field resource → open (authenticated popup)
 *   R-02  login → module → field resource → download (attachment)
 *   R-03  unauthorized resource access → login redirect
 *   R-04  unavailable artifact → honest state, no actions
 *   R-05  mobile: module → resource page (no overflow, actions visible)
 *   R-06  Alice → logout → Bob: no resource state leakage
 *
 * API mocked at the network boundary (no real backend, never production).
 * Behavioral + accessibility assertions only — no pixel checks.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";

const alice = {
  user_id: 1,
  email: "alice@example.com",
  display_name: "Alice",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

const bob = {
  user_id: 2,
  email: "bob@example.com",
  display_name: "Bob",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

function mockResources(page: Page, opts: { authedAs?: "alice" | "bob" } = { authedAs: "alice" }): void {
  const state: { user: typeof alice | null } = { user: opts.authedAs === "bob" ? bob : alice };

  // Context-scoped: the Open action opens a POPUP that must hit the
  // same mock (page.route would not intercept popup requests).
  void page.context().route(API, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    switch (path) {
      case "/api/v1/auth/me":
        return state.user ? json(state.user) : json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "e2e-r" } },
          401,
        );
      case "/api/v1/auth/logout":
        state.user = null;
        return json({ ok: true });
      case "/api/v1/gamification":
        return json({
          total_xp: 0,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 300,
          current_streak: 0,
          longest_streak: 0,
          achievements_earned: 0,
          recent_transactions: [],
        });
      // Survivor plan: the download button renders (server verdict).
      case "/api/v1/subscription":
        return json({
          plan_code: "survivor",
          plan_name: "Survivor",
          price: 9.9,
          currency: "usd",
          billing_period: "month",
          status: "active",
          started_at: "2026-08-01T12:00:00Z",
          current_period_started_at: null,
          renews_at: null,
          ends_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          provider: null,
          entitlements: {
            daily_lessons: 10,
            daily_quizzes: 10,
            resource_download: true,
            quiz_before_lesson: true,
            community: true,
          },
        });
      case "/api/v1/modules/WAT-boiling":
        return json({
          module_id: "WAT-boiling",
          title: "Boiling Water for Purification",
          description: "Learn the correct boiling procedure.",
          category: "water",
          subcategory: "purification",
          difficulty: "beginner",
          estimated_duration: 20,
          content_version: 1,
          knowledge_items: [],
          lesson: {
            lesson_id: "WAT-boiling-L01",
            title: "Boiling Water for Purification",
            estimated_minutes: 15,
            completed: false,
          },
          quiz: {
            quiz_id: "WAT-boiling-Q01",
            title: "Boiling Water Quiz",
            question_count: 3,
            best_score: null,
            attempt_count: 0,
          },
          resources: [
            { resource_id: "WAT-boiling-R01", title: "Boiling Water Quick Reference", resource_type: "checklist", file_format: "PDF" },
            { resource_id: "WAT-filtration-R01", title: "Water Filtration Quick Reference", resource_type: "checklist", file_format: "PDF" },
          ],
          progress: { lesson_completed: false, quiz_best_score: null, completed: false },
        });
      case "/api/v1/resources/WAT-boiling-R01":
        return json({
          resource_id: "WAT-boiling-R01",
          title: "Boiling Water Quick Reference",
          resource_type: "checklist",
          resource_origin: "generated",
          file_format: "PDF",
          source_url: null,
          license: null,
          redistribution: null,
          module_id: "WAT-boiling",
          module_title: "Boiling Water for Purification",
          artifact_available: true,
        });
      case "/api/v1/resources/WAT-filtration-R01":
        return json({
          resource_id: "WAT-filtration-R01",
          title: "Water Filtration Quick Reference",
          resource_type: "checklist",
          resource_origin: "generated",
          file_format: "PDF",
          source_url: null,
          license: null,
          redistribution: null,
          module_id: "WAT-filtration",
          module_title: "Water Filtration",
          artifact_available: false,
        });
      case "/api/v1/resources/WAT-boiling-R01/download":
        if (!state.user) {
          return json(
            { error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "e2e-r" } },
            401,
          );
        }
        {
          const url = new URL(route.request().url());
          const disposition = url.searchParams.get("disposition") ?? "attachment";
          return route.fulfill({
            status: 200,
            contentType: "application/pdf",
            headers: {
              "content-disposition": `${disposition}; filename="wat-boiling-quick-reference.pdf"`,
              "cache-control": "private, no-store",
            },
            body: "%PDF-1.4 resource fixture body",
          });
        }
      default:
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-r" } }),
        });
    }
  });
}

async function goToBoilingResource(page: Page): Promise<void> {
  await page.goto("/modules/WAT-boiling");
  await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /field resources/i })).toBeVisible();
  // The Phase 23 mission layout lists each artifact as a card with its
  // own "Open" link (the title itself is not a link anymore) — scope the
  // click to the boiling row.
  const boilingRow = page.locator(".panel").filter({ hasText: "Boiling Water Quick Reference" });
  await boilingRow.getByRole("link", { name: /^open/i }).click();
  await expect(page.getByRole("heading", { name: "Boiling Water Quick Reference" })).toBeVisible();
}

test.describe("resource journeys", () => {
  test("R-01 — authenticated user opens a field resource in a new tab", async ({ page }) => {
    mockResources(page, { authedAs: "alice" });
    await goToBoilingResource(page);

    const open = page.getByRole("link", { name: /open artifact/i });
    await expect(open).toHaveAttribute("target", "_blank");
    await expect(open).toHaveAttribute("rel", "noopener noreferrer");

    // Opening navigates to the authenticated endpoint — never a signed
    // URL in the UI. Assert the REQUEST (robust across headless PDF
    // viewer modes — the popup's rendered content is not the contract).
    const requestPromise = page
      .context()
      .waitForEvent("request", (req) => req.url().includes("/download"));
    const [popup] = await Promise.all([page.waitForEvent("popup"), open.click()]);
    const request = await requestPromise;
    expect(request.url()).toContain("/api/v1/resources/WAT-boiling-R01/download");
    expect(request.url()).toContain("disposition=inline");
    expect(request.url()).not.toContain("X-Amz-"); // no signed URL leaks into navigation
    await popup.close();
  });

  test("R-02 — download triggers an attachment with the artifact filename", async ({ page }) => {
    mockResources(page, { authedAs: "alice" });
    await goToBoilingResource(page);

    const downloadLink = page.getByRole("link", { name: /download/i });
    await expect(downloadLink).toHaveAttribute(
      "href",
      /\/resources\/WAT-boiling-R01\/download\?disposition=attachment/,
    );

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      downloadLink.click(),
    ]);
    expect(download.suggestedFilename()).toBe("wat-boiling-quick-reference.pdf");
  });

  test("R-03 — unauthenticated resource access redirects to login", async ({ page }) => {
    // No session: the auth bootstrap 401s and the guard redirects.
    void page.route(API, (route) => {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "e2e-r" } }),
      });
    });

    await page.goto("/resources/WAT-boiling-R01");
    await expect(page.getByRole("heading", { name: /practical survival/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /continue with google/i })).toBeVisible();
  });

  test("R-04 — an unavailable artifact shows the honest state with no actions", async ({ page }) => {
    mockResources(page, { authedAs: "alice" });

    await page.goto("/modules/WAT-boiling");
    await page.locator(".panel").filter({ hasText: "Water Filtration Quick Reference" })
      .getByRole("link", { name: /^open/i }).click();

    await expect(page.getByRole("heading", { name: "Water Filtration Quick Reference" })).toBeVisible();
    await expect(page.getByText(/hasn't been generated yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /open artifact/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /download/i })).toHaveCount(0);
  });

  test("R-05 — mobile: field resources stay reachable without horizontal overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only layout assertions");
    mockResources(page, { authedAs: "alice" });

    await page.goto("/modules/WAT-boiling");
    await expect(page.getByRole("heading", { name: /field resources/i })).toBeVisible();
    await page.locator(".panel").filter({ hasText: "Boiling Water Quick Reference" })
      .getByRole("link", { name: /^open/i }).click();

    await expect(page.getByRole("heading", { name: "Boiling Water Quick Reference" })).toBeVisible();
    await expect(page.getByRole("link", { name: /open artifact/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /download/i })).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test("R-06 — cross-user isolation: Alice's resource state never reaches Bob", async ({ page }) => {
    mockResources(page, { authedAs: "alice" });

    // Alice browses a resource (memory-cache only — nothing persisted
    // beyond user-owned quiz drafts and the device-scoped theme pref).
    await goToBoilingResource(page);
    const persistedKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter(
        (k) => !k.startsWith("quiz-draft:") && k !== "theme-pref",
      ),
    );
    expect(persistedKeys).toHaveLength(0);

    // Sign out through the account menu, then Bob signs in on the SAME
    // browser — no storage wipe, no cache survives the session switch.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await expect(page.getByRole("heading", { name: /practical survival/i })).toBeVisible();

    mockResources(page, { authedAs: "bob" });
    await page.goto("/modules/WAT-boiling");
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();

    // Bob gets his own session's data — and none of Alice's cached state.
    const persistedAfter = await page.evaluate(() =>
      Object.keys(localStorage).filter(
        (k) => !k.startsWith("quiz-draft:") && k !== "theme-pref",
      ),
    );
    expect(persistedAfter).toHaveLength(0);
  });
});
