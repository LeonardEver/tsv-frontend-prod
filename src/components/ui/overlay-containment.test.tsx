/**
 * Overlay containment contract.
 *
 * jsdom has no layout engine, so this does not measure pixels — it pins the
 * properties that made the mobile defects possible:
 *
 *  - overlays must sit in the layering scale (an unset z-index on portaled
 *    Radix content loses to the z-40 bottom navigation),
 *  - dialogs must be capped against the viewport and scroll internally
 *    (a centred panel with no max-height puts its own top and bottom
 *    off-screen with nothing able to reach them),
 *  - menus must cap their height too, and keep off the viewport edge.
 *
 * The viewport-boundary and horizontal-overflow behaviour is covered for
 * real in `e2e/mobile-overlays.spec.ts`, which has a layout engine.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Dialog } from "./Dialog";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); }}>
        Open dialog
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Report post">
        <p>Body</p>
      </Dialog>
    </>
  );
}

describe("Dialog containment", () => {
  it("caps the panel against the viewport and scrolls internally", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));

    const content = await screen.findByRole("dialog");
    // `dvh`, not `vh`: a collapsing mobile toolbar must not push the
    // panel's own footer out of reach.
    expect(content.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(content.className).toContain("overflow-y-auto");
    expect(content.className).toContain("overscroll-contain");
  });

  it("layers above the app chrome", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));

    const content = await screen.findByRole("dialog");
    expect(content.className).toContain("z-[var(--z-modal)]");

    // The backdrop is a sibling in the portal, not a child of the panel.
    const overlay = document.querySelector(".fixed.inset-0.z-\\[var\\(--z-overlay\\)\\]");
    expect(overlay).not.toBeNull();
  });

  it("keeps the close control reachable", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close dialog/i })).toBeInTheDocument();
    });
  });
});

describe("DropdownMenu containment", () => {
  it("layers above the bottom navigation and caps its own height", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu trigger={<button type="button">Account menu</button>}>
        <DropdownMenuItem>Profile</DropdownMenuItem>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole("button", { name: /account menu/i }));

    const menu = await screen.findByRole("menu");
    // Without an explicit layer the portaled menu sits at z-auto and the
    // fixed bottom nav (z-nav) paints straight over it.
    expect(menu.className).toContain("z-[var(--z-popover)]");
    expect(menu.className).toContain("overflow-y-auto");
    expect(menu.className).toContain("overscroll-contain");
    // Radix computes the available height from the trigger and the
    // collision padding, so a long menu scrolls instead of overflowing.
    expect(menu.className).toContain("--radix-dropdown-menu-content-available-height");
  });
});
