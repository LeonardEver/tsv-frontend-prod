/**
 * Create post (Phase 21 §9, restyled Phase 23) — category + title +
 * body, plain text only, in the Lovable panel language. The backend
 * sanitizes on write; errors (rate limit, invalid input) surface inline
 * via the stable error codes.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { describeError } from "@/lib/api/error-map";
import { Input, Label } from "@/components/ui/Input";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/layout/AppShell";
import { CommunityGate } from "./CommunityGate";
import { createCommunityPost, fetchCommunityCategories } from "./community.api";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { fetchSubscription } from "@/features/plans/plans.api";

const TITLE_MAX = 120;
const BODY_MAX = 8000;

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [categoryCode, setCategoryCode] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const userId = useCurrentUserId();
  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });
  const entitled = subscriptionQuery.data?.entitlements.community === true;

  const categoriesQuery = useQuery({
    queryKey: queryKeys.community.categories,
    queryFn: fetchCommunityCategories,
    enabled: entitled,
    staleTime: 5 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createCommunityPost,
    onSuccess: (created) => {
      void navigate(`/community/posts/${created.post_id}`, { replace: true });
    },
    onError: (err) => {
      const copy = describeError(err);
      setError(copy.title + (copy.description ? ` ${copy.description}` : ""));
    },
  });

  if (!subscriptionQuery.isPending && subscriptionQuery.data && !entitled) {
    return <CommunityGate />;
  }
  if (!entitled) {
    return (
      <div role="status" aria-label="Loading community" className="space-y-4">
        <div className="panel h-12 animate-pulse" aria-hidden="true" />
        <div className="panel h-64 animate-pulse" aria-hidden="true" />
      </div>
    );
  }
  if (categoriesQuery.isError) {
    return (
      <ErrorState
        error={categoriesQuery.error}
        onRetry={() => void categoriesQuery.refetch()}
      />
    );
  }

  const categories = categoriesQuery.data?.categories ?? [];
  const canSubmit =
    categoryCode !== "" &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !createMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to="/community" className="text-muted-foreground hover:text-foreground">
          ← Community
        </Link>
      </nav>

      <PageHeader
        eyebrow="Community"
        title="New Discussion"
        description="Share a question, field report or technique with other members."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          createMutation.mutate({
            category_code: categoryCode,
            title: title.trim(),
            body: body.trim(),
          });
        }}
        className="space-y-6"
      >
        <div className="panel space-y-4 p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label htmlFor="cp-topic">Category</Label>
            <select
              id="cp-topic"
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary/50"
              value={categoryCode}
              onChange={(e) => { setCategoryCode(e.target.value); }}
            >
              <option value="" disabled>
                Choose a category…
              </option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="cp-title">Title</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <Input
              id="cp-title"
              required
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => { setTitle(e.target.value); }}
              placeholder="A clear question or field note"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="cp-body">Body</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <textarea
              id="cp-body"
              required
              value={body}
              maxLength={BODY_MAX}
              onChange={(e) => { setBody(e.target.value); }}
              rows={8}
              placeholder="Share the details — what happened, what worked, what would you ask?"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground">
              Plain text only — links and formatting are stripped to keep
              the community safe.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="alert">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {createMutation.isPending ? "Publishing…" : "Publish"}
          </button>
          <Link
            to="/community"
            className="inline-flex min-h-12 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
