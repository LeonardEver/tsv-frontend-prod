import { useState } from "react";

/** Retain only the same canonical entity while a locale request is pending or
 * fails. Callers must hide its text until the selected locale resolves. */
export function useRetainedEntity<T>(id: string | undefined, data: T | undefined): T | undefined {
  const [saved, setSaved] = useState<{ id: string; data: T } | null>(null);
  if (id && data && (saved?.id !== id || saved.data !== data)) setSaved({ id, data });
  return data ?? (saved && saved.id === id ? saved.data : undefined);
}
