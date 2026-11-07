/**
 * Community surface tests (Phase 21 §9/§10/§17).
 *
 * - Free users see the upgrade gate (backend refuses the same calls).
 * - Survivor/Operator: list, post detail, comments, voting, reports,
 *   edit/delete own content.
 * - Bodies render as plain text — XSS payloads stay inert strings.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { __seedCommunityPost, __resetCommunity, __setTestPlan, testUser } from "@/test/msw/handlers";
import CommunityPage from "./index";
import CreatePostPage from "./CreatePost";
import PostDetailPage from "./PostDetail";

const API = "*/api/v1";

function authed() {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
}

function renderList() {
  authed();
  return renderAtRoute(<CommunityPage />, "/community");
}

function renderCreate() {
  authed();
  return renderAtRoute(<CreatePostPage />, "/community/new");
}

function renderDetail(postId: number) {
  authed();
  return renderAtRoute(<PostDetailPage />, `/community/posts/${postId}`, "/community/posts/:postId");
}

beforeEach(() => {
  __resetCommunity();
  __setTestPlan("survivor");
});

describe("CommunityPage — plan gate", () => {
  it("shows the upgrade gate for Free users instead of a broken page", async () => {
    __setTestPlan("free");
    renderList();

    await screen.findByText(/community is available with survivor and operator/i);
    expect(screen.getByRole("link", { name: /explore survivor/i })).toHaveAttribute("href", "/plans");
    expect(screen.queryByRole("link", { name: /new discussion/i })).toBeNull();
    __setTestPlan("survivor");
  });

  it("lists posts with author, topic, votes and comment counts for Survivor", async () => {
    __seedCommunityPost({ title: "Boiling at altitude", category_code: "water" });
    renderList();

    // The feed header is the "Discussions" section title.
    await screen.findByRole("heading", { name: "Discussions" });
    await screen.findByRole("link", { name: /boiling at altitude/i });
    expect(screen.getByText("Test Learner")).toBeInTheDocument();
    // "Water" appears as the post's topic chip AND the categories rail.
    expect(screen.getAllByText("Water").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /new discussion/i })).toBeInTheDocument();
    // Sorting controls exist as tabs.
    expect(screen.getByRole("tab", { name: "Top" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Latest" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Most discussed" })).toBeInTheDocument();
  });
});

describe("CreatePostPage", () => {
  it("creates a post with the chosen topic and navigates to it", async () => {
    const createSpy = vi.fn();
    server.use(
      http.post(`${API}/community/posts`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        createSpy(body);
        const post = __seedCommunityPost({
          category_code: String(body.category_code),
          title: String(body.title),
          body: String(body.body),
        });
        return HttpResponse.json(post, { status: 201 });
      }),
    );
    renderCreate();

    await screen.findByRole("heading", { name: "New Discussion" });
    const user = userEvent.setup();
    // Wait for the category list to load before selecting.
    await screen.findByRole("option", { name: "Water" });
    await user.selectOptions(screen.getByLabelText(/category/i), "water");
    await user.type(screen.getByLabelText(/title/i), "Boiling at altitude");
    await user.type(screen.getByLabelText(/body/i), "Does boiling time change above 2,000m?");
    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => { expect(createSpy).toHaveBeenCalledOnce(); });
    const firstCall = createSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toEqual({
      category_code: "water",
      title: "Boiling at altitude",
      body: "Does boiling time change above 2,000m?",
    });
  });
});

describe("PostDetailPage", () => {
  it("renders the post with comments and toggles votes idempotently", async () => {
    __seedCommunityPost({ title: "Boiling at altitude" });
    renderDetail(1);

    await screen.findByRole("heading", { name: "Boiling at altitude" });
    expect(screen.getByText(/does boiling time change above 2,000m\?/i)).toBeInTheDocument();
    expect(screen.getByText(/^0 comments$/i)).toBeInTheDocument();

    const user = userEvent.setup();
    const vote = screen.getByRole("button", { name: /vote on this post/i });
    await user.click(vote);
    await waitFor(() => { expect(vote).toHaveTextContent("1"); });
    await user.click(vote);
    await waitFor(() => { expect(vote).toHaveTextContent("0"); });

    // Comment + reply flow.
    await user.type(screen.getByLabelText(/add a comment/i), "At 2,000m add a minute.");
    await user.click(screen.getByRole("button", { name: /^post comment$/i }));
    await screen.findByText(/at 2,000m add a minute\./i);
  });

  it("reports a post through the reason dialog", async () => {
    const reportSpy = vi.fn();
    server.use(
      http.post(`${API}/community/posts/:postId/report`, async ({ request }) => {
        reportSpy(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );
    __seedCommunityPost({ title: "Suspicious post", mine: false });
    renderDetail(1);

    await screen.findByRole("heading", { name: "Suspicious post" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /report/i }));
    await user.selectOptions(screen.getByLabelText(/reason/i), "spam");
    await user.type(screen.getByLabelText(/details \(optional\)/i), "Link farm.");
    await user.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => { expect(reportSpy).toHaveBeenCalledOnce(); });
    const firstCall = reportSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toEqual({ reason: "spam", details: "Link farm." });
  });

  it("lets the author edit and delete their own post", async () => {
    const deleteSpy = vi.fn();
    server.use(
      http.delete(`${API}/community/posts/:postId`, () => {
        deleteSpy();
        return HttpResponse.json({ ok: true });
      }),
    );
    __seedCommunityPost({ title: "Boiling at altitude" });
    renderDetail(1);

    await screen.findByRole("heading", { name: "Boiling at altitude" });
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));
    await waitFor(() => { expect(deleteSpy).toHaveBeenCalledOnce(); });
  });

  it("renders hostile bodies as inert plain text", async () => {
    __seedCommunityPost({
      title: "Field note",
      body: "<script>alert('xss')</script>Boiling works at any altitude.",
    });
    renderDetail(1);

    await screen.findByRole("heading", { name: "Field note" });
    // The payload is text, not a live element.
    const bodyText = screen.getByText(
      (_, el) =>
        el?.tagName === "P" &&
        el.textContent?.includes("<script>alert('xss')</script>"),
    );
    expect(bodyText).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });
});
