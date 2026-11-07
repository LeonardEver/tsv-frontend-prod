/**
 * Category detail: subcategories with module cards, empty state,
 * existence-hiding 404.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import CategoryDetailPage from "./CategoryDetail";

describe("CategoryDetailPage", () => {
  it("renders modules grouped by subcategory", async () => {
    renderAtRoute(<CategoryDetailPage />, "/categories/water", "/categories/:categorySlug");
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Water" })).toBeInTheDocument(); },
    );
    // Exact name: the mission card title "Boiling Water for Purification"
    // also matches /purification/i; only the section header is exact.
    expect(screen.getByRole("heading", { name: "Purification" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /boiling water for purification/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling",
    );
    expect(screen.getByRole("link", { name: /water filtration/i })).toBeInTheDocument();
    // Hero chips carry the authoritative counts from the /categories row.
    expect(screen.getByText("7 missions")).toBeInTheDocument();
    expect(screen.getByText("1 complete")).toBeInTheDocument();
  });

  it("shows the completed state on a finished module card", async () => {
    renderAtRoute(<CategoryDetailPage />, "/categories/water", "/categories/:categorySlug");
    await waitFor(() =>
      { expect(screen.getByRole("link", { name: /water filtration/i })).toBeInTheDocument(); },
    );
    // Completed cards render a "Complete" chip (with a check icon) instead
    // of a labelled "Completed" badge — scoped to the finished card.
    const filtration = screen.getByRole("link", { name: /water filtration/i });
    expect(within(filtration).getByText("Complete")).toBeInTheDocument();
  });

  it("renders an empty state for a category without modules", async () => {
    server.use(
      http.get("*/api/v1/categories/water", () =>
        HttpResponse.json({
          slug: "water",
          code: "WAT",
          title: "Water",
          subcategories: [],
        }),
      ),
    );
    renderAtRoute(<CategoryDetailPage />, "/categories/water", "/categories/:categorySlug");
    await waitFor(() => { expect(screen.getByText(/no missions yet/i)).toBeInTheDocument(); });
  });

  it("surfaces unknown categories as not available (existence-hiding)", async () => {
    renderAtRoute(<CategoryDetailPage />, "/categories/does-not-exist", "/categories/:categorySlug");
    await waitFor(() =>
      { expect(screen.getByText(/this content isn't available/i)).toBeInTheDocument(); },
    );
  });
});
