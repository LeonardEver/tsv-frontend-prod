/**
 * Resource download entitlement states (Phase 21 §6).
 *
 * The server enforces downloads; the UI only projects the verdict:
 *   Free — Open always available; Download replaced by the upgrade CTA.
 *   Survivor/Operator — Open + Download.
 */
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { __setTestPlan, testUser } from "@/test/msw/handlers";
import ResourcePage from "./index";

const API = "*/api/v1";

function renderResource() {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(testUser)));
  return renderAtRoute(
    <ResourcePage />,
    "/resources/WAT-boiling-R01",
    "/resources/:resourceId",
  );
}

describe("ResourcePage — download entitlement", () => {
  it("keeps Open but replaces Download with the upgrade CTA on Free", async () => {
    __setTestPlan("free");
    renderResource();

    await screen.findByRole("heading", { name: "Boiling Water Quick Reference" });
    expect(screen.getByRole("link", { name: /^open artifact$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^download$/i })).toBeNull();
    expect(screen.getByRole("link", { name: /download with survivor/i })).toBeInTheDocument();
    __setTestPlan("survivor");
  });

  it("shows Open and Download for Survivor", async () => {
    __setTestPlan("survivor");
    renderResource();

    await screen.findByRole("heading", { name: "Boiling Water Quick Reference" });
    const open = screen.getByRole("link", { name: /^open artifact$/i });
    expect(open).toHaveAttribute("href", expect.stringContaining("disposition=inline"));
    const download = screen.getByRole("link", { name: /^download$/i });
    expect(download).toHaveAttribute("href", expect.stringContaining("disposition=attachment"));
    expect(screen.queryByRole("link", { name: /download with survivor/i })).toBeNull();
  });

  it("shows Open and Download for Operator", async () => {
    __setTestPlan("operator");
    renderResource();

    await screen.findByRole("heading", { name: "Boiling Water Quick Reference" });
    expect(screen.getByRole("link", { name: /^open artifact$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^download$/i })).toBeInTheDocument();
    __setTestPlan("survivor");
  });
});
