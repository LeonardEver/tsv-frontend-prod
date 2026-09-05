/**
 * ThemeSync — applies the store's theme to the document once, above the
 * router, so BOTH the authed shell and the standalone login screen get
 * the active palette. Also keeps the mobile browser chrome color in
 * step with the theme.
 */
import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

export function ThemeSync() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#f2f0ea" : "#0e1113");
  }, [theme]);

  return null;
}
