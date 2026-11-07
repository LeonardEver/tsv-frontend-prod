/**
 * Resource page — the field-resource artifact surface (Phase 16 §11,
 * restyled Phase 23). The Lovable `resources.$id.tsx` hero supplies the
 * visual structure: full-bleed category artwork, chips, Open/Download
 * actions, meta tiles.
 *
 * Everything here PROJECTS server state: metadata, module context and
 * `artifact_available` come from GET /resources/:id; the Open/Download
 * actions are plain links to the authenticated download endpoint — the
 * frontend never decides whether a resource is authorized, published or
 * downloadable (§24), never renders canonical IDs, storage keys or
 * signed URLs, and never fabricates availability.
 *
 * Origins (DEC-014):
 *   generated → artifact delivery via the download endpoint
 *               (Open: inline/browser-native; Download: attachment).
 *   external  → attribution state only; the source link is followed
 *               by the user at the source, never auto-downloaded.
 */
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Download, ExternalLink, Eye, Lock } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { API_BASE } from "@/lib/config/env";
import { ApiError } from "@/lib/api/errors";
import { catColorForCode, categoryImage } from "@/lib/category-visuals";
import { Chip, EmptyState, Eyebrow } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import { analytics } from "@/lib/analytics/events";
import { isValidCanonicalId } from "@/lib/validate/canonical-id";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { fetchSubscription } from "@/features/plans/plans.api";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchModule } from "@/features/modules/modules.api";
import { getResourceTypeIcon } from "./resource-identity";
import { fetchResource } from "./resources.api";

function isHttpUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

export default function ResourcePage() {
  const { resourceId } = useParams();
  const valid = typeof resourceId === "string" && isValidCanonicalId(resourceId);

  const query = useQuery({
    queryKey: queryKeys.content.resource(resourceId ?? ""),
    queryFn: () => fetchResource(resourceId as string),
    enabled: valid,
    staleTime: 30 * 60_000,
    retry: false, // 404 is a terminal "not available" state
  });

  // Phase 21 §6 — download entitlement is a SERVER verdict; the query
  // only decides whether the Download button or the upgrade CTA renders.
  const userId = useCurrentUserId();
  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });
  const canDownload =
    subscriptionQuery.data?.entitlements.resource_download === true;

  // Module context for the hero artwork (resource rows carry no
  // category — the module's category resolves the config-driven image).
  const moduleQuery = useQuery({
    queryKey:
      query.data?.module_id
        ? queryKeys.content.module(query.data.module_id)
        : ["modules", "resource-context"],
    queryFn: () => fetchModule(query.data?.module_id as string),
    enabled: Boolean(query.data?.module_id),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  if (!valid) {
    return (
      <EmptyState
        title="This resource doesn't exist"
        description="Check the link and try again."
        action={
          <Link
            to="/categories"
            className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
          >
            All categories
          </Link>
        }
      />
    );
  }

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading resource" className="space-y-6">
        <div className="panel h-72 animate-pulse" aria-hidden="true" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel-2 h-20 animate-pulse" aria-hidden="true" />
          <div className="panel-2 h-20 animate-pulse" aria-hidden="true" />
          <div className="panel-2 h-20 animate-pulse" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    // Existence-hiding: unknown, unpublished and deprecated resources
    // are indistinguishable from a missing artifact.
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          title="This resource isn't available"
          description="It may have been removed or is not published yet."
          action={
            <Link
              to="/categories"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
            >
              All categories
            </Link>
          }
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const resource = query.data;
  const TypeIcon = getResourceTypeIcon(resource.resource_type);
  const downloadBase = `${API_BASE}/resources/${resource.resource_id}/download`;

  const moduleCategory = moduleQuery.data?.category;
  const categoryRow = categoriesQuery.data?.categories.find(
    (c) => c.slug === moduleCategory,
  );
  const color = catColorForCode(categoryRow?.code ?? moduleCategory);
  const image = categoryImage(categoryRow?.code ?? moduleCategory);
  const categoryTitle = categoryRow?.title;

  const availabilityLabel =
    resource.resource_origin === "external"
      ? "External source"
      : resource.artifact_available
        ? "Ready"
        : "Not yet generated";

  return (
    <div className="mx-auto max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link
          to={resource.module_id ? `/modules/${resource.module_id}` : "/categories"}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {resource.module_title}
        </Link>
      </nav>

      <section className="rise panel relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt=""
            width={1200}
            height={750}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/88 to-background/40" />
        <div className="relative max-w-2xl p-6 pt-28 sm:p-10 sm:pt-40">
          <Eyebrow>Field resource</Eyebrow>
          <h1 className="page-title mt-2 font-display text-3xl leading-tight font-semibold tracking-wide uppercase sm:text-4xl">
            {resource.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip color={color}>{resource.resource_type}</Chip>
            {resource.file_format ? <Chip>{resource.file_format}</Chip> : null}
            {categoryTitle ? <Chip color={color}>{categoryTitle}</Chip> : null}
          </div>

          {resource.resource_origin === "external" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {isHttpUrl(resource.source_url) ? (
                <a
                  href={resource.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glow-ember inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
                >
                  <ExternalLink className="size-4" /> View at the source
                </a>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">
                  This resource lives outside the Survival Vault — the source link is not available.
                </p>
              )}
            </div>
          ) : resource.artifact_available ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`${downloadBase}?disposition=inline`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  analytics.track({
                    name: "resource_opened",
                    properties: { resource_id: resource.resource_id, action: "open" },
                  });
                }}
                className="glow-ember inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
              >
                <Eye className="size-4" /> Open artifact
              </a>
              {canDownload ? (
                <a
                  href={`${downloadBase}?disposition=attachment`}
                  onClick={() => {
                    analytics.track({
                      name: "resource_opened",
                      properties: { resource_id: resource.resource_id, action: "download" },
                    });
                  }}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
                >
                  <Download className="size-4" /> Download
                </a>
              ) : (
                <Link
                  to="/plans"
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-dashed border-border px-5 text-sm tracking-wide text-muted-foreground uppercase"
                >
                  <Lock className="size-4" /> Download with Survivor
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              This field resource hasn't been generated yet.
            </p>
          )}

          {resource.resource_origin === "generated" && resource.artifact_available ? (
            <p className="mt-4 max-w-md font-mono text-[11px] leading-relaxed text-muted-foreground">
              {canDownload
                ? "Downloads are served through your authenticated session — never shared outside your account."
                : "You can always view this resource here. Offline downloads are included in Survivor and Operator."}
            </p>
          ) : null}

          {resource.resource_origin === "external" && (resource.license || resource.redistribution) ? (
            <dl className="mt-4 grid max-w-md gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {resource.license ? (
                <div>
                  <dt className="font-mono tracking-widest text-foreground uppercase">License</dt>
                  <dd className="mt-0.5">{resource.license}</dd>
                </div>
              ) : null}
              {resource.redistribution ? (
                <div>
                  <dt className="font-mono tracking-widest text-foreground uppercase">Redistribution</dt>
                  <dd className="mt-0.5">{resource.redistribution}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="panel-2 p-4">
          <Eyebrow>Type</Eyebrow>
          <p className="mt-1.5 flex items-center gap-2 text-sm">
            <TypeIcon className="size-4 shrink-0" style={{ color }} aria-hidden="true" />
            {resource.resource_type}
          </p>
        </div>
        <div className="panel-2 p-4">
          <Eyebrow>Format</Eyebrow>
          <p className="mt-1.5 text-sm">{resource.file_format ?? "—"}</p>
        </div>
        <div className="panel-2 p-4">
          <Eyebrow>Availability</Eyebrow>
          <p className="mt-1.5 text-sm">{availabilityLabel}</p>
        </div>
      </section>

      {resource.module_id ? (
        <div className="mt-6 flex justify-end">
          <Link
            to={`/modules/${resource.module_id}`}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase"
          >
            {resource.module_title} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
