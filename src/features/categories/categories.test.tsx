/**
 * Categories list: loading, success, empty, error-with-retry.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import CategoriesPage from "./index";

const API = "*/api/v1";

describe("CategoriesPage", () => {
  it("renders category cards with authoritative counts", async () => {
    renderAtRoute(<CategoriesPage />, "/categories");
    // The card's accessible name is now "Water · tagline · 7 missions ·
    // 1 complete · Water progress" — the authoritative module/completed
    // counts identify the card ("Start Here" missions also mention water).
    const water = await screen.findByRole("link", { name: /7 missions/i });
    expect(water).toHaveAttribute("href", "/categories/water");
    expect(water).toHaveTextContent("Water");
    expect(water).toHaveTextContent("1 complete");
    const fire = screen.getByRole("link", { name: /2 missions/i });
    expect(fire).toHaveAttribute("href", "/categories/fire");
    expect(fire).toHaveTextContent("0 complete");
  });

  it("renders an intentional empty state", async () => {
    server.use(
      http.get(`${API}/categories`, () => HttpResponse.json({ categories: [] })),
    );
    renderAtRoute(<CategoriesPage />, "/categories");
    await waitFor(() => { expect(screen.getByText(/no regions yet/i)).toBeInTheDocument(); });
  });

  it("shows an error with a working retry", async () => {
    // NOTE: no `once: true` — the client's own GET-retry policy would
    // consume the one-shot handler and the query would silently succeed.
    server.use(
      http.get(`${API}/categories`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderAtRoute(<CategoriesPage />, "/categories");
    await waitFor(() => { expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(); }, {
      timeout: 5000,
    });

    // Restore the default handlers, then retry succeeds.
    server.resetHandlers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      { expect(screen.getByRole("link", { name: /7 missions/i })).toBeInTheDocument(); },
    );
  });
});
