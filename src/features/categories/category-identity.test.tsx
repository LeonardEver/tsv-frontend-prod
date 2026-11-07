/**
 * Category identity: every published region gets its declared accent,
 * label, and environment; unknown codes fall back to the neutral globe —
 * never an invented accent, never a raw internal ID shown as a label.
 *
 * Phase 24: MED and FOR now carry real identities (no more compass
 * fallback for registered regions).
 */
import { describe, expect, it } from "vitest";
import {
  Compass,
  Droplets,
  Flame,
  Globe,
  HeartPulse,
  Leaf,
  Mountain,
  Sprout,
  Tent,
  Wheat,
} from "lucide-react";
import {
  categoryToneChip,
  getCategoryIdentity,
  getCategoryIdentityBySlug,
  type CategoryTone,
} from "./category-identity";

const IDENTITIES = {
  WAT: { icon: Droplets, tone: "info", envClass: "env-water", label: "Water region" },
  FIR: { icon: Flame, tone: "warning", envClass: "env-fire", label: "Fire region" },
  SUR: { icon: Mountain, tone: "field", envClass: "env-sur", label: "Survival Fundamentals region" },
  SHE: { icon: Tent, tone: "canvas", envClass: "env-she", label: "Shelter region" },
  FOD: { icon: Wheat, tone: "harvest", envClass: "env-fod", label: "Food region" },
  AGR: { icon: Sprout, tone: "success", envClass: "env-agr", label: "Agriculture region" },
  MED: { icon: HeartPulse, tone: "medic", envClass: "env-med", label: "Medical & First Aid region" },
  FOR: { icon: Leaf, tone: "forage", envClass: "env-for", label: "Foraging & Plants region" },
  NAV: { icon: Compass, tone: "azimuth", envClass: "env-nav", label: "Navigation region" },
} as const;

describe("getCategoryIdentity", () => {
  it.each(Object.entries(IDENTITIES))(
    "maps the %s code to its declared identity",
    (code, expected) => {
      const identity = getCategoryIdentity(code);
      expect(identity.icon).toBe(expected.icon);
      expect(identity.tone).toBe(expected.tone);
      expect(identity.envClass).toBe(expected.envClass);
      expect(identity.label).toBe(expected.label);
    },
  );

  it("matches codes case-insensitively", () => {
    expect(getCategoryIdentity("wat").icon).toBe(Droplets);
    expect(getCategoryIdentity("agr").icon).toBe(Sprout);
    expect(getCategoryIdentity("med").icon).toBe(HeartPulse);
    expect(getCategoryIdentity("for").icon).toBe(Leaf);
  });

  it("falls back to the neutral globe only for truly unknown codes", () => {
    for (const code of ["XYZ", "WAT2", undefined, null, ""]) {
      const identity = getCategoryIdentity(code);
      expect(identity.icon).toBe(Globe);
      expect(identity.tone).toBe("neutral");
      expect(identity.envClass).toBe("");
    }
  });

  it("never surfaces internal codes as labels", () => {
    for (const [code, expected] of Object.entries(IDENTITIES)) {
      const identity = getCategoryIdentity(code);
      expect(identity.label).not.toBe(code);
      expect(identity.label).toBe(expected.label);
    }
  });
});

describe("getCategoryIdentityBySlug", () => {
  it.each([
    ["water", "WAT"],
    ["fire", "FIR"],
    ["survival-fundamentals", "SUR"],
    ["shelter", "SHE"],
    ["food", "FOD"],
    ["agriculture", "AGR"],
    ["medical-first-aid", "MED"],
    ["foraging-plants", "FOR"],
    ["navigation", "NAV"],
  ])("maps the %s slug to the %s identity", (slug, code) => {
    const bySlug = getCategoryIdentityBySlug(slug);
    const byCode = getCategoryIdentity(code);
    expect(bySlug.icon).toBe(byCode.icon);
    expect(bySlug.tone).toBe(byCode.tone);
  });

  it("falls back for unknown or missing slugs", () => {
    for (const slug of ["", undefined, null, "unknown-region"]) {
      const identity = getCategoryIdentityBySlug(slug);
      expect(identity.icon).toBe(Globe);
      expect(identity.tone).toBe("neutral");
    }
  });
});

describe("categoryToneChip", () => {
  it("has a chip class for every tone the identities use", () => {
    const tones: CategoryTone[] = [
      ...Object.values(IDENTITIES).map((i) => i.tone),
      "neutral",
    ];
    for (const tone of new Set(tones)) {
      expect(categoryToneChip[tone]).toBeTruthy();
    }
  });

  it("keeps WAT and FIR chips unchanged from the reference design", () => {
    expect(categoryToneChip.info).toBe("bg-info-water/15 text-info-water");
    expect(categoryToneChip.warning).toBe("bg-warning-amber/15 text-warning-amber");
  });
});
