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
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { communityCategoryTitle } from "@/i18n/community-category";
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
  { value: "top", get label() { return uiText("community:top_cae043"); } },
  { value: "latest", get label() { return uiText("community:latest_decd7c"); } },
  { value: "discussed", get label() { return uiText("community:most_discussed_bc5c2b"); } },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

export default function CommunityPage() {
  useInterfaceLocale();
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
      pushToast({ tone: "success", get title() { return uiText("community:report_sent_a7615c"); }, get description() { return uiText("community:thanks_for_keeping_the_field_clean_ab64a2"); } });
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
      pushToast({ tone: "success", get title() { return uiText("community:post_deleted_fb8dc2"); } });
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
          eyebrow={uiText("community:field_network_3a6b73")}
          title={uiText("community:community_bfd58e")}
          description={uiText("community:learn_from_other_people_in_the_field_79ef06")}
        />
        <LockedState
          title={uiText("community:community_is_available_with_survivor_and_operator_e05706")}
          description={uiText("community:ask_questions_share_field_reports_and_compare_91bda5")}
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
      <div role="status" aria-label={uiText("community:loading_community_e0888d")} className="space-y-4">
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
        eyebrow={uiText("community:field_network_3a6b73")}
        title={uiText("community:community_bfd58e")}
        description={uiText("community:learn_from_other_people_in_the_field_79ef06")}
        aside={
          <Link
            to="/community/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />{" "}{uiText("community:new_discussion_d7f618")}</Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="mb-5 flex gap-2" role="tablist" aria-label={uiText("community:sort_discussions_9d4e2e")}>
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

          <SectionHeader eyebrow={uiText("community:featured_ae31ad")} title={uiText("community:discussions_0474a6")} />
          {postsQuery.isPending && posts.length === 0 ? (
            <div className="grid gap-3" aria-hidden="true">
              <div className="panel h-28 animate-pulse" />
              <div className="panel h-28 animate-pulse" />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              title={category ? uiText("community:no_posts_in_this_topic_yet_797199") : uiText("community:no_posts_yet_c1d980")}
              description={uiText("community:be_the_first_to_start_a_discussion_bbdaf9")}
              action={
                <Link
                  to="/community/new"
                  className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >{uiText("community:new_discussion_d7f618")}</Link>
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
                {postsQuery.isFetchingNextPage ? uiText("community:loading_33ce41") : uiText("community:load_more_dfe60c")}
              </button>
            </div>
          ) : null}
        </div>

        <aside>
          <p className="eyebrow mb-3">{uiText("community:categories_6ccb60")}</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
            <li>
              <button
                type="button"
                onClick={() => { setSearchParams({ sort }); }}
                className="min-h-9"
                aria-pressed={category === ""}
              >
                <Chip color={category === "" ? "var(--ember)" : undefined}>{uiText("community:all_topics_e0631c")}</Chip>
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
                  <Chip color={category === c.code ? "var(--ember)" : undefined}>{communityCategoryTitle(c.code, c.name)}</Chip>
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
          label={uiText("community:delete_f6fdbe")}
          title={uiText("community:delete_this_post_81bc1f")}
          description={uiText("community:comments_are_deleted_with_it_this_cannot_425a8a")}
          pending={deleteMutation.isPending}
          onConfirm={() => { deleteMutation.mutate(deleteTarget); }}
        />
      ) : null}
    </div>
  );
}
