/**
 * Translation access for the admin analytics surface.
 *
 * Two accessors rather than one overloaded function, because the two kinds
 * of entry have different shapes:
 *
 *   t("charts.noRows")                    static copy
 *   tf("charts.versusPrevious", {...})    copy with {{placeholders}}
 *
 * Both are typed against the dotted paths of `Dict`, so a mistyped key is a
 * compile error. The placeholder names themselves are checked at runtime
 * (a declared placeholder with no supplied value throws), which keeps the
 * dictionary a plain data object that can be diffed and reviewed as a
 * whole — the reason interpolation is templating here and not functions.
 *
 * `useTr()` binds both to the current language, which changes only when the
 * language store changes, so the returned object's identity is a safe memo
 * dependency.
 */
import { useMemo } from "react";
import type { ErrorCopy } from "@/lib/api/error-map";
import type { Dict } from "./dictionary";
import { interpolate, translate } from "./dictionary";
import { adminErrorCopy } from "./error-copy";
import { useAdminLanguage, type AdminLanguage } from "./language";

/** Dotted paths of every leaf in the dictionary. */
type StringPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${StringPaths<T[K]>}`;
}[keyof T & string];

export interface Tr {
  language: AdminLanguage;
  /** Static copy. */
  t: (key: StringPaths<Dict>) => string;
  /** Copy with `{{name}}` placeholders filled in. */
  tf: (key: StringPaths<Dict>, params: Readonly<Record<string, number | string>>) => string;
  /** `ErrorState`'s optional `explain` prop, in this console's language. */
  errorCopy: (error: unknown) => ErrorCopy;
}

function build(language: AdminLanguage): Tr {
  const t: Tr["t"] = (key) => translate(language, key);
  const tf: Tr["tf"] = (key, params) => interpolate(language, key, params);
  return { language, t, tf, errorCopy: (error) => adminErrorCopy(error, { t, tf }) };
}

export function useTr(): Tr {
  const language = useAdminLanguage();
  return useMemo(() => build(language), [language]);
}

/** The same accessors outside React (helpers that are not components). */
export function trFor(language: AdminLanguage): Tr {
  return build(language);
}
