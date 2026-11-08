import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { testUser } from "@/test/msw/handlers";
import { renderWithProviders } from "@/test/render";
import { AuthProvider } from "@/features/auth/use-auth";
import { useAuth } from "@/features/auth/auth-context";
import { changeLocale, getLocale, initializeLocale, useLocale } from "./index";

beforeEach(async () => { window.localStorage.clear(); await changeLocale("en"); });
afterEach(async () => { vi.restoreAllMocks(); window.localStorage.clear(); await changeLocale("en"); });

function SessionReader({ record }: { record: string[] }) {
  const auth = useAuth(); const locale = useLocale();
  const [draft, setDraft] = useState("");
  useEffect(() => { if (auth.status === "authenticated") record.push(locale); }, [auth.status, locale, record]);
  return <><output data-testid="session-locale">{auth.status}:{locale}</output><input aria-label="draft" value={draft} onChange={(event) => { setDraft(event.target.value); }} /><button onClick={() => { void auth.logout(); }}>logout</button></>;
}

describe("account preference synchronization", () => {
  it("applies the confirmed account preference before exposing an authenticated session", async () => {
    await changeLocale("es", { explicit: true });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    server.use(http.get("*/api/v1/auth/me", () => HttpResponse.json({ ...testUser, country: "DE", preferred_language: "pt-BR", language_confirmed_at: "2026-11-08T10:00:00Z" })));
    const record: string[] = [];
    renderWithProviders(<AuthProvider><SessionReader record={record} /></AuthProvider>);
    await waitFor(() => { expect(screen.getByTestId("session-locale")).toHaveTextContent("authenticated:pt-BR"); });
    expect(record).toEqual(["pt-BR"]);
    expect(window.localStorage.getItem("survival-academy-language")).toBe("pt-BR");
  });
  it("saves an explicit pre-login choice to a new unconfirmed account once", async () => {
    await changeLocale("es", { explicit: true });
    let confirmed = false;
    const patch = vi.fn(async ({ request }: { request: Request }) => {
      expect(await request.json()).toEqual({ preferred_language: "es" }); confirmed = true;
      return HttpResponse.json({ preferred_language: "es" });
    });
    server.use(
      http.get("*/api/v1/auth/me", () => HttpResponse.json({ ...testUser, country: "US", preferred_language: confirmed ? "es" : "en", language_confirmed_at: confirmed ? "2026-11-08T10:00:00Z" : null })),
      http.patch("*/api/v1/profile", patch),
    );
    renderWithProviders(<AuthProvider><SessionReader record={[]} /></AuthProvider>);
    await waitFor(() => { expect(screen.getByTestId("session-locale")).toHaveTextContent("authenticated:es"); });
    expect(patch).toHaveBeenCalledTimes(1);
  });
  it("keeps the chosen language after logout and a fresh browser bootstrap", async () => {
    let loggedIn = true;
    server.use(
      http.get("*/api/v1/auth/me", () => loggedIn ? HttpResponse.json({ ...testUser, country: "BR", preferred_language: "en", language_confirmed_at: "2026-11-08T10:00:00Z" }) : HttpResponse.json({ error: { code: "UNAUTHORIZED", message: "Session ended", request_id: "locale-test" } }, { status: 401 })),
      http.post("*/api/v1/auth/logout", () => { loggedIn = false; return HttpResponse.json({ ok: true }); }),
    );
    renderWithProviders(<AuthProvider><SessionReader record={[]} /></AuthProvider>);
    await waitFor(() => { expect(screen.getByTestId("session-locale")).toHaveTextContent("authenticated:en"); });
    await userEvent.type(screen.getByRole("textbox", { name: "draft" }), "Keep this draft");
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => { expect(screen.getByTestId("session-locale")).toHaveTextContent("unauthenticated:en"); });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["pt-BR"]);
    await initializeLocale();
    expect(getLocale()).toBe("en");
    expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue("Keep this draft");
  });
});
