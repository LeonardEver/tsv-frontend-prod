/**
 * Learning → Community topic mapping (Phase 21 §12).
 *
 * A learning category maps to a Community topic only when the product
 * taxonomy has a direct equivalent; everything else lands in General.
 * No post is ever fabricated — the link just opens the relevant topic.
 */
const DIRECT_TOPICS = new Set([
  "water",
  "fire",
  "shelter",
  "food",
  "agriculture",
  "medical",
  "navigation",
]);

export function communityTopicForCategory(
  categorySlug: string | null | undefined,
): string {
  if (categorySlug && DIRECT_TOPICS.has(categorySlug)) return categorySlug;
  return "general";
}
