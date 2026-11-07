/**
 * Category visuals (Phase 23) — the centralized, config-driven mapping
 * between backend category codes and the Lovable visual identity.
 *
 * Every region accent, glow tint and image is resolved HERE, from the
 * authoritative backend category code. No screen contains if/else blocks
 * over category slugs; new categories plug in by extending the tables
 * below (identity + asset), never by editing page markup.
 *
 * - `LOVABLE_SLUG_BY_CODE` — backend code → Lovable design slug. The CSS
 *   variable naming convention `var(--cat-<slug>)` (ported from the
 *   Lovable reference) is the single source of category color.
 * - `CATEGORY_IMAGE_BY_CODE` — backend code → generated artwork (the
 *   Lovable reference assets, now production-owned under src/assets).
 *   Unknown/future categories return null and render the icon identity
 *   from features/categories/category-identity instead of a wrong photo.
 */
import agricultureImg from "@/assets/agriculture.jpg";
import energyImg from "@/assets/energy.jpg";
import fireImg from "@/assets/fire.jpg";
import foodImg from "@/assets/food.jpg";
import foragingImg from "@/assets/foraging.jpg";
import fundamentalsImg from "@/assets/fundamentals.jpg";
import medicalImg from "@/assets/medical.jpg";
import navigationImg from "@/assets/navigation.jpg";
import shelterImg from "@/assets/shelter.jpg";
import waterImg from "@/assets/water.jpg";

/** Backend category code → Lovable design slug (drives `var(--cat-*)`). */
export const LOVABLE_SLUG_BY_CODE: Record<string, string> = {
  WAT: "water",
  FIR: "fire",
  SHE: "shelter",
  FOD: "food",
  AGR: "agriculture",
  FOR: "foraging",
  MED: "medical",
  NAV: "navigation",
  SUR: "fundamentals",
  ENE: "energy",
};

/** Backend category slugs → authoritative codes (imported editorial
 * content uses lowercase slugs where codes are uppercase). */
export const SLUG_TO_CODE: Record<string, string> = {
  water: "WAT",
  fire: "FIR",
  "survival-fundamentals": "SUR",
  shelter: "SHE",
  food: "FOD",
  agriculture: "AGR",
  "medical-first-aid": "MED",
  "foraging-plants": "FOR",
  navigation: "NAV",
  energy: "ENE",
  engineering: "ENG",
  military: "MIL",
  maps: "MAP",
  "hunting-fishing": "HUN",
  bushcraft: "BUS",
  communication: "COM",
  mechanical: "MEC",
  "engineering-diy": "ENG",
  homesteading: "HOM",
  "food-production": "FPR",
  "security-safety": "SEC",
  "military-government": "MIL",
  "maps-reference": "MAP",
};

/** Resolve either a category code ("WAT") or a slug ("water") to the
 * authoritative uppercase code. */
export function codeFromSlug(codeOrSlug: string | null | undefined): string | null {
  if (!codeOrSlug) return null;
  const upper = codeOrSlug.toUpperCase();
  if (LOVABLE_SLUG_BY_CODE[upper] || CATEGORY_IMAGE_BY_CODE[upper]) return upper;
  return SLUG_TO_CODE[codeOrSlug.toLowerCase()] ?? upper;
}

/** Backend category code → generated artwork asset. */
export const CATEGORY_IMAGE_BY_CODE: Record<string, string> = {
  WAT: waterImg,
  FIR: fireImg,
  SHE: shelterImg,
  FOD: foodImg,
  AGR: agricultureImg,
  FOR: foragingImg,
  MED: medicalImg,
  NAV: navigationImg,
  SUR: fundamentalsImg,
  ENE: energyImg,
};

/** Editorial region copy migrated from the Lovable reference design.
 * Presentation copy (like button labels), not business data — the backend
 * is authoritative for titles and counts. */
const CATEGORY_COPY: Record<string, { tagline: string; description: string }> = {
  WAT: {
    tagline: "Find it. Judge it. Treat it.",
    description: "Master the skills required to find, collect, evaluate and treat water in the field.",
  },
  FIR: {
    tagline: "Heat, light, sterilisation.",
    description: "Build, sustain and control fire in wet, cold and windy conditions.",
  },
  SHE: {
    tagline: "Stay dry. Stay warm.",
    description: "Site selection, tarp systems and insulation against ground and weather.",
  },
  FOD: {
    tagline: "Store what you have.",
    description: "Preservation, drying, canning and safe storage without refrigeration.",
  },
  AGR: {
    tagline: "Grow a supply line.",
    description: "Soil, seed, irrigation and season planning for a self-reliant plot.",
  },
  FOR: {
    tagline: "Read the ground.",
    description: "Botanical identification, look-alikes and responsible harvesting.",
  },
  MED: {
    tagline: "Stabilise and evacuate.",
    description: "Bleeding control, wound care and field assessment under pressure.",
  },
  NAV: {
    tagline: "Know where you stand.",
    description: "Map reading, bearings, terrain association and route planning.",
  },
  SUR: {
    tagline: "The base layer.",
    description: "Priorities of survival, kit discipline and emergency planning.",
  },
  ENE: {
    tagline: "Power off the grid.",
    description: "Solar capture, storage sizing and safe off-grid electrical practice.",
  },
};

/** Region tagline for a backend category code (or slug). */
export function categoryTagline(code: string | null | undefined): string {
  const resolved = codeFromSlug(code);
  return (resolved ? CATEGORY_COPY[resolved] : undefined)?.tagline ?? "Uncharted region";
}

/** Region description for a backend category code (or slug). */
export function categoryDescription(code: string | null | undefined): string {
  const resolved = codeFromSlug(code);
  return (resolved ? CATEGORY_COPY[resolved] : undefined)?.description ?? "New region — content in development.";
}

/** Neutral fallback design slug for categories without a registered
 * visual identity (never invents an accent for unknown data). */
const FALLBACK_LOVABLE_SLUG = "fundamentals";

/** CSS accent color for a backend category code (or slug) — the one
 * sanctioned way to obtain a category color. */
export function catColorForCode(code: string | null | undefined): string {
  const resolved = codeFromSlug(code);
  const lovableSlug = (resolved ? LOVABLE_SLUG_BY_CODE[resolved] : undefined) ?? FALLBACK_LOVABLE_SLUG;
  return `var(--cat-${lovableSlug})`;
}

/** Lovable-style accent for an already-known Lovable design slug. */
export function catColorForSlug(slug: string): string {
  return `var(--cat-${slug})`;
}

/** Generated artwork for a backend category code (or slug), or null when
 * the category has no registered image (callers fall back to the icon
 * identity — never to a mismatched photo). */
export function categoryImage(code: string | null | undefined): string | null {
  const resolved = codeFromSlug(code);
  return (resolved ? CATEGORY_IMAGE_BY_CODE[resolved] : undefined) ?? null;
}
