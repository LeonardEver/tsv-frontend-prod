import { describe, expect, it } from "vitest";
import { isSafeRedirectPath, safeRedirectPath } from "./redirect";
import { isValidCanonicalId } from "./canonical-id";
import { isSafeUrl } from "./url-scheme";

describe("safeRedirectPath", () => {
  it("accepts root-relative paths", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
    expect(isSafeRedirectPath("/modules/WAT-boiling/quiz")).toBe(true);
  });

  it("rejects protocol-relative, absolute and traversal targets", () => {
    expect(isSafeRedirectPath("//evil.com")).toBe(false);
    expect(isSafeRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeRedirectPath("/../etc")).toBe(false);
    expect(isSafeRedirectPath("javascript:alert(1)")).toBe(false);
  });

  it("falls back to / for unsafe or missing values", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath(null)).toBe("/");
  });
});

describe("isValidCanonicalId", () => {
  it("accepts canonical content IDs", () => {
    expect(isValidCanonicalId("WAT-boiling-L01")).toBe(true);
    expect(isValidCanonicalId("FIR-safety-Q01")).toBe(true);
  });

  it("rejects malformed IDs", () => {
    expect(isValidCanonicalId("WAT-boiling-L1")).toBe(false);
    expect(isValidCanonicalId("boiling-L01")).toBe(false);
    expect(isValidCanonicalId("WAT-boiling-X01")).toBe(false);
    expect(isValidCanonicalId("WAT-boiling-L01; DROP TABLE")).toBe(false);
  });
});

describe("isSafeUrl (content scheme allowlist)", () => {
  it("allows http/https/mailto and relative URLs", () => {
    expect(isSafeUrl("https://example.com/doc")).toBe(true);
    expect(isSafeUrl("http://example.com/doc")).toBe(true);
    expect(isSafeUrl("mailto:someone@example.com")).toBe(true);
    expect(isSafeUrl("/relative/path")).toBe(true);
    expect(isSafeUrl("#anchor")).toBe(true);
  });

  it("rejects dangerous schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("vbscript:x")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });
});
