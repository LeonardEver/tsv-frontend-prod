/**
 * ThemeSync — applies the store's theme to the document once, above the
 * router, so BOTH the authed shell and the standalone login screen get
 * the active palette. Also keeps the mobile browser chrome color in
 * step with the theme.
 */
import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

/**
 * The browser-chrome color has to be a literal — a `theme-color` meta does
 * not take a CSS variable — so these are the resolved sRGB values of the
 * `--background` token in each theme. If the token moves, these move:
 *
 *   light  --background: oklch(0.955 0.008 85) → #f3f0ea
 *   dark   --background: oklch(0.17 0.008 220) → #0e1113
 */
const THEME_COLOR: Record<string, string> = {
  light: "#f3f0ea",
  dark: "#0e1113",
};

export function ThemeSync() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLOR[theme] ?? "#0e1113");
  }, [theme]);

  return null;
}
