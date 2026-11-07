/**
 * ThemeToggle: accessible labelled toggle that flips the device theme
 * preference in the sanctioned UI store.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUiStore } from "@/stores/ui-store";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ theme: "dark" });
  });

  it("labels the ACTION, not the state", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
  });

  it("toggles the theme via keyboard and updates the label", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Switch to light theme" });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(useUiStore.getState().theme).toBe("light");
    expect(localStorage.getItem("theme-pref")).toBe("light");
    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
  });
});
