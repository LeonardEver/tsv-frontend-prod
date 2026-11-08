/**
 * Route-level error element (frontend spec §24 — error boundary per
 * route-level).
 *
 * Every route inherits this through the pathless root in router.tsx, so a
 * render crash or a failed lazy chunk inside ANY screen renders a styled
 * recovery panel instead of React Router's raw "Unexpected Application
 * Error!" page — which is what a broken import used to produce.
 *
 * It complements AppErrorBoundary rather than duplicating it: that boundary
 * sits ABOVE the router and never sees the errors the router resolves itself
 * (route element render failures, chunk-load failures, thrown responses).
 * The two together cover both halves of the app.
 *
 * Copy comes from the shared error map, so a route failure speaks the same
 * language as every API failure. Recovery is deliberately two-way: reloading
 * re-attempts the failed chunk — the actual remedy for a stale deployment —
 * while the link is the way out when reloading cannot help.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { ErrorState } from "@/components/shared/ErrorState";
import { BrandMark } from "@/components/layout/BrandMark";

export function RouteErrorElement() {
  useInterfaceLocale();
  const error = useRouteError();
  // Development keeps the underlying cause on screen; production never ships
  // internals. `detail` is only rendered behind the DEV check below.
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null;

  return (
    <div className="topo grain relative flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <BrandMark />
      <div className="w-full max-w-lg">
        <ErrorState error={error} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="rounded-md bg-accent-ember px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-ember-hover"
          >{uiText("common:reload_the_app_d94912")}</button>
          <Link
            to="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
          >{uiText("common:back_to_base_camp_071840")}</Link>
        </div>
        {import.meta.env.DEV && detail ? (
          <p className="mt-6 font-mono text-xs break-words text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
