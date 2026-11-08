/**
 * Each published module has its own cover, shared by cards, lessons,
 * mission headers and results. Region artwork stays on region surfaces.
 * New module IDs get a neutral image-free state until artwork is added.
 */
const covers = import.meta.glob<string>("../assets/modules/*.jpg", {
  eager: true,
  import: "default",
  query: "?url",
});

export function moduleImage(moduleId: string | null | undefined): string | null {
  if (!moduleId) return null;
  return covers[`../assets/modules/${moduleId}.jpg`] ?? null;
}
