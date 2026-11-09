import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { changeLocale } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import { NotificationCenter } from "./NotificationCenter";

const API = "*/api/v1/notifications";
const item = { notification_id: "achievement:7", kind: "achievement", at: "2026-11-08T12:00:00Z", read_at: null, target: "/gamification", subject: { entity_type: "achievement", entity_id: "first_quiz", title: "First quiz passed", description: "Pass your first quiz" } };
beforeEach(() => { server.use(http.get("*/api/v1/auth/me", () => HttpResponse.json({ user_id: 42, email: "notifications@example.com", display_name: "Learner", created_at: "2026-08-01T00:00:00Z" }))); });
afterEach(async () => { await changeLocale("en"); useUiStore.setState({ toasts: [] }); });

describe("account notification center", () => {
  it("opens an honest empty state and never shows a fabricated unread badge", async () => {
    const user = userEvent.setup();
    renderAtRoute(<NotificationCenter />, "/dashboard");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up")).toBeVisible();
    expect(screen.queryByTestId("notification-unread")).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => { expect(screen.queryByRole("menu")).toBeNull(); });
    expect(screen.getByRole("button", { name: "Notifications" })).toHaveFocus();
  });
  it("leaves items unread on open, persists explicit mark-all and navigates to the real target", async () => {
    let read = false;
    const payloads: unknown[] = [];
    server.use(http.get(API, () => HttpResponse.json({ items: [{ ...item, read_at: read ? "2026-11-08T13:00:00Z" : null }], unread_count: read ? 0 : 1 })), http.post(`${API}/read`, async ({ request }) => { payloads.push(await request.json()); read = true; return HttpResponse.json({ ok: true }); }));
    const user = userEvent.setup();
    const { router } = renderAtRoute(<NotificationCenter />, "/dashboard");
    await waitFor(() => { expect(screen.getByTestId("notification-unread")).toHaveTextContent("1"); });
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByRole("menuitem", { name: /New achievement unlocked/ })).toHaveAttribute("href", "/gamification");
    expect(payloads).toHaveLength(0);
    await user.click(screen.getByRole("menuitem", { name: "Mark all as read" }));
    await waitFor(() => { expect(screen.queryByTestId("notification-unread")).toBeNull(); });
    expect(payloads).toEqual([{ notification_ids: ["achievement:7"] }]);
    await user.click(screen.getByRole("menuitem", { name: /New achievement unlocked/ }));
    await waitFor(() => { expect(router.state.location.pathname).toBe("/gamification"); });
  });
  it("shows a retry action when loading fails, without claiming there are no notifications", async () => {
    let failed = true;
    server.use(http.get(API, () => failed ? HttpResponse.json({ error: { code: "FORBIDDEN", message: "Fixture failure", request_id: "notification-test" } }, { status: 403 }) : HttpResponse.json({ items: [], unread_count: 0 })));
    const user = userEvent.setup();
    renderAtRoute(<NotificationCenter />, "/dashboard");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your notifications");
    expect(screen.queryByText("You're all caught up")).toBeNull();
    failed = false;
    await user.click(screen.getByRole("menuitem", { name: "Try again" }));
    expect(await screen.findByText("You're all caught up")).toBeVisible();
  });
  it("keeps unread state and reports a failed acknowledgement in the selected language", async () => {
    await changeLocale("pt-BR");
    server.use(http.get(API, () => HttpResponse.json({ items: [{ ...item, subject: { ...item.subject, title: "Primeiro quiz aprovado", description: "Passe no seu primeiro quiz" } }], unread_count: 1, localization: { content_locale: "pt-BR", fallback: false, missing_count: 0 } })), http.post(`${API}/read`, () => HttpResponse.json({ error: { code: "FORBIDDEN", message: "Denied", request_id: "notification-test" } }, { status: 403 })));
    const user = userEvent.setup();
    renderAtRoute(<NotificationCenter />, "/dashboard");
    await user.click(screen.getByRole("button", { name: "Notificações" }));
    await user.click(await screen.findByRole("menuitem", { name: "Marcar todas como lidas" }));
    await waitFor(() => { expect(useUiStore.getState().toasts.at(-1)?.title).toContain("Não foi possível marcar"); });
    expect(screen.getByTestId("notification-unread")).toHaveTextContent("1");
  });
});
