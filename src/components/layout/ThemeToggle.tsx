/**
 * Theme toggle (O-4 light theme, user-requested) — switches the device
 * theme preference. Purely presentational state; the light palette lives
 * entirely in the token layer (`[data-theme="light"]` overrides).
 * Icon shows the theme you WOULD switch to; the aria-label names the
 * action.
 */
import { Moon, Sun } from "lucide-react";
import { clsx } from "clsx";
import { useUiStore } from "@/stores/ui-store";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={clsx(
        "inline-flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-5" />
      ) : (
        <Moon aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}
