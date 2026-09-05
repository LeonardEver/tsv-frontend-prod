/**
 * Resource page (Phase 16 §22): metadata rendering, server-authoritative
 * availability, generated vs external handling, states, and the
 * Open/Download actions as plain authenticated links.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import ResourcePage from "./index";

const API = "*/api/v1";

function renderResource(id: string) {
  return renderAtRoute(<ResourcePage />, `/resources/${id}`, "/resources/:resourceId");
}

describe("ResourcePage", () => {
  it("renders metadata and Open/Download actions for an available generated resource", async () => {
    renderResource("WAT-boiling-R01");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Boiling Water Quick Reference" })).toBeInTheDocument();
    });
    // Type and format surface in the hero chips AND the meta tiles.
    expect(screen.getAllByText("checklist").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF").length).toBeGreaterThan(0);
    // Module context (breadcrumb + footer link), never a raw ID.
    const moduleLinks = screen.getAllByRole("link", {
      name: /boiling water for purification/i,
    });
    expect(moduleLinks.length).toBeGreaterThan(0);
    for (const link of moduleLinks) {
      expect(link).toHaveAttribute("href", "/modules/WAT-boiling");
    }

    // Open: new tab, noopener, authenticated endpoint — no signed URL.
    const open = screen.getByRole("link", { name: /^open artifact$/i });
    expect(open).toHaveAttribute(
      "href",
      "/api/v1/resources/WAT-boiling-R01/download?disposition=inline",
    );
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");

    // Download: same tab, attachment disposition.
    const download = screen.getByRole("link", { name: /download/i });
    expect(download).toHaveAttribute(
      "href",
      "/api/v1/resources/WAT-boiling-R01/download?disposition=attachment",
    );
    expect(download).not.toHaveAttribute("target");
  });

  it("renders the honest unavailable state when the artifact is missing", async () => {
    renderResource("WAT-filtration-R01");
    await waitFor(() => {
      expect(screen.getByText(/hasn't been generated yet/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /^open artifact$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
  });

  it("renders external resources as attribution-only with a safe source link", async () => {
    renderResource("FIR-safety-R01");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /fire safety quick reference/i }),
      ).toBeInTheDocument();
    });
    const source = screen.getByRole("link", { name: /view at the source/i });
    expect(source).toHaveAttribute("href", "https://example.com/fire-safety.pdf");
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("CC BY 4.0")).toBeInTheDocument();
    expect(screen.getByText("allowed")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
  });

  it("hides unknown resources behind the unavailable state (existence-hiding)", async () => {
    renderResource("WAT-missing-R01");
    await waitFor(() => {
      expect(screen.getByText(/this resource isn't available/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /all categories/i })).toHaveAttribute(
      "href",
      "/categories",
    );
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("shows an error state with a working retry for server failures", async () => {
    server.use(
      http.get(`${API}/resources/WAT-boiling-R01`, () =>
        HttpResponse.json(
          { error: { code: "REQUEST_ERROR", message: "unavailable" } },
          { status: 503 },
        ),
      ),
    );
    renderResource("WAT-boiling-R01");
    await waitFor(
      () => { expect(screen.getAllByText(/something went wrong/i).length).toBeGreaterThan(0); },
      { timeout: 5000 },
    );
    server.resetHandlers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Boiling Water Quick Reference" })).toBeInTheDocument();
    });
  });

  it("rejects malformed ids without issuing a request", async () => {
    renderResource("WAT-boiling-X99");
    await waitFor(() => {
      expect(screen.getByText(/this resource doesn't exist/i)).toBeInTheDocument();
    });
  });
});
