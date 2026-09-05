/**
 * Primitive accessibility fundamentals: labels, roles, disabled/loading
 * semantics, progress announcements.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";
import { Input, Label } from "./Input";
import { Alert } from "./Alert";
import { Dialog } from "./Dialog";
import { ProgressBar } from "@/components/sa/primitives";
import { useState } from "react";

describe("Button", () => {
  it("fires click and supports keyboard activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    const btn = screen.getByRole("button", { name: "Press" });
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables interaction while loading (double-submit guard)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Submit</Button>);
    const btn = screen.getByRole("button", { name: "Submit" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("honors the disabled state", () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole("button", { name: "Nope" })).toBeDisabled();
  });
});

describe("Input + Label", () => {
  it("links the visible label to the input", () => {
    render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" />
      </div>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("links the error message via aria-describedby", () => {
    render(<Input id="email" aria-label="Email" error="Invalid email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Invalid email");
  });
});

describe("Alert", () => {
  it("uses role=alert for danger tones", () => {
    render(<Alert tone="danger" title="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it("uses role=status for info tones", () => {
    render(<Alert tone="info" title="Heads up" />);
    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
  });
});

describe("ProgressBar (sa)", () => {
  it("exposes progressbar semantics with the label", () => {
    render(<ProgressBar value={60} label="3 of 5 questions" />);
    const bar = screen.getByRole("progressbar", { name: "3 of 5 questions" });
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps values into 0–100", () => {
    render(<ProgressBar value={140} label="clamped" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("Dialog", () => {
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onOpenChange={setOpen} title="Delete item?">
        <button type="button">Confirm</button>
      </Dialog>
    );
  }

  it("renders a labelled modal dialog with focusable content", () => {
    render(<Harness />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Delete item?");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
  });
});
