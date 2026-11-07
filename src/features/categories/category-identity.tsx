/**
 * Category identity (Phase 15.5 §5, extended Phase 24 §25) — semantic
 * accents that make each curriculum region (Water, Fire, Survival
 * Fundamentals, Shelter, Food, Agriculture, Foraging, Medical, Navigation)
 * feel like a place, not a database row. Typography/icon-driven, built
 * exclusively from tokens: no illustrations, no stock imagery.
 *
 * Keyed by the AUTHORITATIVE category code from /categories. Every known
 * region carries a unique icon/mark, a tone chip, an atmospheric env
 * class, and an accessible label. Truly unknown categories fall back to
 * the neutral map — the design never blocks on missing identity data
 * and never invents an accent for a category the backend does not
 * declare. Registered-but-unseen future regions (energy, engineering,
 * military, maps) already have identities waiting.
 */
import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Droplets,
  Flame,
  Globe,
  HeartPulse,
  Leaf,
  Map,
  Mountain,
  Shield,
  Sprout,
  Tent,
  Wheat,
  Wrench,
  Zap,
} from "lucide-react";

export type CategoryTone =
  | "info" // Water — cool blue
  | "warning" // Fire — ember amber
  | "field" // Survival Fundamentals — compass steel
  | "canvas" // Shelter — tarp canvas
  | "harvest" // Food — harvest clay
  | "success" // Agriculture — growth pine
  | "azimuth" // Navigation — azimuth teal
  | "medic" // Medical & First Aid — clinical rose
  | "forage" // Foraging & Plants — field moss
  | "neutral"; // fallback

export interface CategoryIdentity {
  icon: LucideIcon;
  tone: CategoryTone;
  /** Atmospheric environment class — the semantic zone wash rendered
   * behind a category's surfaces. "" = neutral. */
  envClass: string;
  /** Accessible name for the region mark where it stands alone. */
  label: string;
}

const IDENTITIES: Record<string, CategoryIdentity> = {
  WAT: { icon: Droplets, tone: "info", envClass: "env-water", label: "Water region" },
  FIR: { icon: Flame, tone: "warning", envClass: "env-fire", label: "Fire region" },
  SUR: { icon: Mountain, tone: "field", envClass: "env-sur", label: "Survival Fundamentals region" },
  SHE: { icon: Tent, tone: "canvas", envClass: "env-she", label: "Shelter region" },
  FOD: { icon: Wheat, tone: "harvest", envClass: "env-fod", label: "Food region" },
  AGR: { icon: Sprout, tone: "success", envClass: "env-agr", label: "Agriculture region" },
  MED: { icon: HeartPulse, tone: "medic", envClass: "env-med", label: "Medical & First Aid region" },
  FOR: { icon: Leaf, tone: "forage", envClass: "env-for", label: "Foraging & Plants region" },
  NAV: { icon: Compass, tone: "azimuth", envClass: "env-nav", label: "Navigation region" },
  // Future registered regions — identities ready before content lands.
  ENE: { icon: Zap, tone: "warning", envClass: "env-fire", label: "Energy region" },
  ENG: { icon: Wrench, tone: "field", envClass: "env-sur", label: "Engineering region" },
  MIL: { icon: Shield, tone: "field", envClass: "env-sur", label: "Military region" },
  MAP: { icon: Map, tone: "azimuth", envClass: "env-nav", label: "Maps region" },
};

const FALLBACK: CategoryIdentity = {
  icon: Globe,
  tone: "neutral",
  envClass: "",
  label: "Uncharted region",
};

/** Slugs the backend uses for categories (imported editorial content
 * uses lowercase slugs where codes are uppercase). Single source of
 * truth lives in lib/category-visuals.ts (Phase 23). */
export { SLUG_TO_CODE } from "@/lib/category-visuals";
import { SLUG_TO_CODE } from "@/lib/category-visuals";

export function getCategoryIdentity(
  code: string | null | undefined,
): CategoryIdentity {
  return (code ? IDENTITIES[code.toUpperCase()] : undefined) ?? FALLBACK;
}

export function getCategoryIdentityBySlug(slug: string | null | undefined): CategoryIdentity {
  if (!slug) return FALLBACK;
  return IDENTITIES[SLUG_TO_CODE[slug.toLowerCase()] ?? ""] ?? FALLBACK;
}

/** Static class map (Tailwind extracts only literal class names). */
export const categoryToneChip: Record<CategoryTone, string> = {
  info: "bg-info-water/15 text-info-water",
  warning: "bg-warning-amber/15 text-warning-amber",
  field: "bg-field-slate/15 text-field-slate",
  canvas: "bg-canvas-tan/15 text-canvas-tan",
  harvest: "bg-harvest-clay/15 text-harvest-clay",
  success: "bg-success-pine/15 text-success-pine",
  azimuth: "bg-azimuth-teal/15 text-azimuth-teal",
  medic: "bg-medic-rose/15 text-medic-rose",
  forage: "bg-forage-moss/15 text-forage-moss",
  neutral: "bg-bg-elevated text-text-secondary",
};
