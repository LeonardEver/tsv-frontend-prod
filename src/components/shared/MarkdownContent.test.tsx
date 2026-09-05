/**
 * Content security boundary tests (frontend spec §22):
 * raw HTML must never become DOM; dangerous link schemes are dropped.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("renders markdown structures", () => {
    render(<MarkdownContent content={"## Heading\n\nSome **bold** text\n\n- one\n- two"} />);
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
  });

  it("never renders raw HTML into the DOM", () => {
    render(
      <MarkdownContent
        content={'## Safe\n\n<img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>'}
      />,
    );
    // react-markdown without rehype-raw drops raw HTML nodes entirely.
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("drops javascript: links and keeps safe ones", () => {
    render(
      <MarkdownContent
        content={"[good](https://example.com) [bad](javascript:alert(1))"}
      />,
    );
    const good = screen.getByRole("link", { name: "good" });
    expect(good).toHaveAttribute("href", "https://example.com");
    expect(good).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument();
  });

  it("drops data: images", () => {
    render(<MarkdownContent content={'![x](data:image/png;base64,AAAA)'} />);
    expect(document.querySelector("img")).toBeNull();
  });

  describe("Phase 24 callouts", () => {
    it("renders a marked blockquote as a semantic callout", () => {
      render(
        <MarkdownContent
          content={"> **Warning:** Keep matches dry.\n> Second line stays quoted."}
        />,
      );
      const callout = document.querySelector(".callout--warning");
      expect(callout).not.toBeNull();
      expect(callout?.querySelector(".callout-title")?.textContent).toBe("WARNING");
      expect(callout?.textContent).toContain("Keep matches dry.");
      expect(callout?.textContent).toContain("Second line stays quoted.");
    });

    it("detects each known marker type", () => {
      render(
        <MarkdownContent
          content={
            "> Safety: never enter a burning structure.\n\n" +
            "> Field note: altitude changes boiling times.\n\n" +
            "> Important: purify before drinking.\n\n" +
            "> Remember: check the wind.\n\n" +
            "> Procedure: cool, then cover.\n\n" +
            "> Example: a one-page plan.\n\n" +
            "> Knowledge check: what boils faster?"
          }
        />,
      );
      for (const type of [
        "safety",
        "field-note",
        "important",
        "remember",
        "procedure",
        "example",
        "knowledge-check",
      ]) {
        expect(document.querySelector(`.callout--${type}`)).not.toBeNull();
      }
    });

    it("leaves unmarked blockquotes as plain quotes", () => {
      render(<MarkdownContent content={"> Just a quote, no marker."} />);
      expect(document.querySelector(".callout")).toBeNull();
      expect(screen.getByText(/just a quote, no marker\./i)).toBeInTheDocument();
    });
  });
});
