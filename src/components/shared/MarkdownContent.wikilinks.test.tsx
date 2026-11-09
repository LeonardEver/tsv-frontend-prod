/** Internal references are preserved verbatim, as requested. */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent wikilinks", () => {
  it("does not translate, rewrite or turn internal references into navigation", () => {
    const { container } = render(
      <MarkdownContent content={"- Build the supplies: [[SUR-preparedness-L01]]\n- Veja: [[FIR-safety-K01|Segurança com o fogo]]"} />,
    );
    expect(container.textContent).toContain("[[SUR-preparedness-L01]]");
    expect(container.textContent).toContain("[[FIR-safety-K01|Segurança com o fogo]]");
    expect(container.querySelector("a")).toBeNull();
  });
});
