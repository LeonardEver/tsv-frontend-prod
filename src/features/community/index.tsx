/**
 * Community list (Phase 21 §9, restyled Phase 23). The Lovable reference
 * `src/routes/community.index.tsx` supplies the visual structure: the
 * two-column layout (discussions + categories rail), sort tabs, and the
 * LockedState gate for Free plans. Every interaction — voting, reporting,
 * editing, deleting, cursor pagination, category filtering — is the
 * unchanged production implementation.
 *
 * Access is Survivor/Operator (server-enforced); Free users get the
 * upgrade gate.
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { describeError } from "@/lib/api/error-map";
import { CommunityPostCard } from "@/components/sa/cards";
import { Chip, EmptyState, LockedState, SectionHeader } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { useUiStore } from "@/stores/ui-store";
import { CommunityGate } from "./CommunityGate";
import {
  deleteCommunityPost,
  fetchCommunityCategories,
  fetchCommunityPosts,
  reportPost,
  votePost,
} from "./community.api";
import { ReportButton, ConfirmDelete } from "./PostDetail";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { fetchSubscription } from "@/features/plans/plans.api";
import { communityPostModel } from "@/features/dashboard/adapters";

const SORTS = [
  { value: "top", label: "Top" },
  { value: "latest", label: "Latest" },
  { value: "discussed", label: "Most discussed" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const category = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") ?? "latest") as SortValue;
  const userId = useCurrentUserId();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<number | null>(null);

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

  const postsQuery = useInfiniteQuery({
    queryKey: queryKeys.community.posts(userId, category || undefined, sort),
    queryFn: ({ pageParam }) =>
      fetchCommunityPosts({
        category: category || undefined,
        sort,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.next_cursor ?? undefined,
    enabled: entitled,
    staleTime:30_000,
  });

  const invalidatePosts = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.community.posts(userId, category || undefined, sort),
    });
  };

  const voteMutation = useMutation({
    mutationFn: (postId: number) => votePost(postId),
    onSettled: invalidatePosts,
  });

  const reportMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: number; payload: { reason: string; details?: string } }) =>
      reportPost(postId, payload),
    onSuccess: () => {
      pushToast({ tone: "success", title: "Report sent", description: "Thanks for keeping the field clean." });
    },
    onError: (err) => {
      const copy = describeError(err);
      pushToast({ tone: "error", title: copy.title, description: copy.description });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: number) => deleteCommunityPost(postId),
    onSuccess: () => {
      setDeleteTarget(null);
      invalidatePosts();
      pushToast({ tone: "success", title: "Post deleted" });
    },
    onError: (err) => {
      const copy = describeError(err);
      pushToast({ tone: "error", title: copy.title, description: copy.description });
    },
  });

  // Free plan → upgrade gate (the backend would refuse the same calls).
  if (!subscriptionQuery.isPending && subscriptionQuery.data && !entitled) {
    return (
      <div>
        <PageHeader
          eyebrow="Field network"
          title="Community"
          description="Learn from other people in the field."
        />
        <LockedState
          title="Community is available with Survivor and Operator"
          description="Ask questions, share field reports and compare gear with other members of the academy."
        />
      </div>
    );
  }

  if (subscriptionQuery.isError) {
    return (
      <ErrorState
        error={subscriptionQuery.error}
        onRetry={() => void subscriptionQuery.refetch()}
      />
    );
  }
  if (!entitled) {
    return (
      <div role="status" aria-label="Loading community" className="space-y-4">
        <div className="panel h-12 animate-pulse" aria-hidden="true" />
        <div className="panel h-28 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (postsQuery.isError) {
    const err = postsQuery.error;
    // The gate normally fires from the subscription query; a direct 403
    // (plan changed mid-session) lands here too — same honest state.
    if (err instanceof ApiError && err.code === "COMMUNITY_REQUIRES_PLAN") {
      return <CommunityGate />;
    }
    return <ErrorState error={err} onRetry={() => void postsQuery.refetch()} />;
  }

  const posts = postsQuery.data?.pages.flatMap((p) => p.posts) ?? [];
  const hasMore =
    postsQuery.data?.pages[postsQuery.data.pages.length - 1]?.pagination
      .has_more ?? false;

  return (
    <div>
      <PageHeader
        eyebrow="Field network"
        title="Community"
        description="Learn from other people in the field."
        aside={
          <Link
            to="/community/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" /> New discussion
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="mb-5 flex gap-2" role="tablist" aria-label="Sort discussions">
            {SORTS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={sort === t.value}
                onClick={() => {
                  const params: Record<string, string> = { sort: t.value };
                  if (category) params.category = category;
                  setSearchParams(params);
                }}
                className={
                  sort === t.value
                    ? "min-h-10 rounded-lg bg-primary/15 px-4 text-sm font-semibold tracking-wide text-primary uppercase"
                    : "min-h-10 rounded-lg border border-border px-4 text-sm tracking-wide text-muted-foreground uppercase transition-colors hover:bg-accent"
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <SectionHeader eyebrow="Featured" title="Discussions" />
          {postsQuery.isPending && posts.length === 0 ? (
            <div className="grid gap-3" aria-hidden="true">
              <div className="panel h-28 animate-pulse" />
              <div className="panel h-28 animate-pulse" />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              title={category ? "No posts in this topic yet" : "No posts yet"}
              description="Be the first to start a discussion."
              action={
                <Link
                  to="/community/new"
                  className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  New discussion
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.post_id}
                  post={communityPostModel(post)}
                  onUpvote={() => { voteMutation.mutate(post.post_id); }}
                  onReport={
                    post.mine ? undefined : () => { setReportTarget(post.post_id); }
                  }
                  onEdit={
                    post.mine
                      ? () => { void navigate(`/community/posts/${post.post_id}`); }
                      : undefined
                  }
                  onDelete={
                    post.mine
                      ? () => { setDeleteTarget(post.post_id); }
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={postsQuery.isFetchingNextPage}
                onClick={() => void postsQuery.fetchNextPage()}
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
              >
                {postsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </div>

        <aside>
          <p className="eyebrow mb-3">Categories</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
            <li>
              <button
                type="button"
                onClick={() => { setSearchParams({ sort }); }}
                className="min-h-9"
                aria-pressed={category === ""}
              >
                <Chip color={category === "" ? "var(--ember)" : undefined}>All topics</Chip>
              </button>
            </li>
            {(categoriesQuery.data?.categories ?? []).map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { setSearchParams({ category: c.code, sort }); }}
                  className="min-h-9"
                  aria-pressed={category === c.code}
                >
                  <Chip color={category === c.code ? "var(--ember)" : undefined}>{c.name}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Report dialog (own posts are excluded — you can't report yourself). */}
      {reportTarget !== null ? (
        <ReportButton
          pending={reportMutation.isPending}
          onReport={(payload) => { reportMutation.mutate({ postId: reportTarget, payload }); }}
          onReported={() => { setReportTarget(null); }}
        />
      ) : null}

      {/* Delete confirmation — destructive actions always confirm. */}
      {deleteTarget !== null ? (
        <ConfirmDelete
          label="Delete"
          title="Delete this post?"
          description="Comments are deleted with it. This cannot be undone."
          pending={deleteMutation.isPending}
          onConfirm={() => { deleteMutation.mutate(deleteTarget); }}
        />
      ) : null}
    </div>
  );
}
