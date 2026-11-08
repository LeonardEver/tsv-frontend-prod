/**
 * Simplified presentation layer.
 *
 * This module adds NOTHING canonical. Region identity — code, accent colour,
 * artwork and editorial tagline — resolves through `@/lib/category-visuals`,
 * the one registry the rest of the app reads from, so a region can never
 * describe itself two different ways. What lives here is the one thing the
 * Simplified experience owns: which ATMOSPHERE a region is rendered in.
 *
 * If you are adding copy, a colour or an image, it belongs in the canonical
 * registry, not here.
 */
import { categoryImage, categoryTagline, codeFromSlug } from "@/lib/category-visuals";

export interface SimplifiedVisualWorld {
  code: string;
  environmentClass: string;
  image: string | null;
  motif: string;
}

/**
 * Backend category code → atmospheric environment class.
 *
 * These class names are the canonical `.env-*` set defined in
 * `src/styles/tokens.css`; the two lists must stay in step. The set is
 * deliberately the nine guided-curriculum codes — a category outside it
 * falls back to the fundamentals wash rather than inventing an atmosphere,
 * exactly as an unregistered category falls back to the neutral identity
 * elsewhere in the app.
 */
const ENVIRONMENT_BY_CODE: Readonly<Record<string, string>> = {
  SUR: "env-sur",
  WAT: "env-water",
  FIR: "env-fire",
  SHE: "env-she",
  FOD: "env-fod",
  AGR: "env-agr",
  FOR: "env-for",
  MED: "env-med",
  NAV: "env-nav",
};

/** Neutral atmosphere for an unregistered category. */
const DEFAULT_ENVIRONMENT = "env-sur";

/**
 * The Simplified view of a region: canonical identity plus the atmosphere it
 * renders in. Accepts a backend code ("WAT") or slug ("water") — callers pass
 * whichever the response they hold actually carries.
 */
export function visualWorld(codeOrSlug: string | null | undefined): SimplifiedVisualWorld {
  const code = codeFromSlug(codeOrSlug) ?? "SUR";
  return {
    code,
    environmentClass: ENVIRONMENT_BY_CODE[code] ?? DEFAULT_ENVIRONMENT,
    image: categoryImage(code),
    motif: categoryTagline(code),
  };
}
