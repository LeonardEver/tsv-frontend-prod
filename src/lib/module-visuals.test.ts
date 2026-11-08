import { describe, expect, it } from "vitest";
import artwork from "../../docs/module-artwork.json";
import { moduleImage } from "./module-visuals";

describe("Module artwork coverage", () => {
  it("provides a distinct local cover for every published curriculum module", () => {
    const moduleIds = Object.keys(artwork.scenes);
    expect(moduleIds).toHaveLength(80);
    const urls = moduleIds.map((moduleId) => {
      const image = moduleImage(moduleId);
      expect(image, `Missing cover for ${moduleId}`).toBeTruthy();
      expect(image).toContain(`${moduleId}.jpg`);
      return image;
    });
    expect(new Set(urls).size).toBe(moduleIds.length);
  });

  it("uses a neutral state for a new or unavailable module", () => {
    expect(moduleImage("SUR-not-published")).toBeNull();
    expect(moduleImage(null)).toBeNull();
    expect(moduleImage(undefined)).toBeNull();
  });
});
