/** Skip link — first tabbable element, visually hidden until focused. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-bg-elevated focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
  );
}
