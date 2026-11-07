/** Skip link — first tabbable element, visually hidden until focused. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--z-toast)] focus:rounded-md focus:bg-popover focus:text-popover-foreground focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
  );
}
