/**
 * Post detail (Phase 21 §9, restyled Phase 23) — title, body, author,
 * topic, comments, reply, voting, reporting, edit/delete own content.
 * The Lovable `community.$post.tsx` panel structure supplies the visuals
 * (hero post panel, author row, bordered upvote, comment panels); every
 * mutation is the unchanged production implementation.
 *
 * Bodies are plain text (backend-sanitized); rendered with
 * whitespace-pre-wrap and React's default escaping — nothing raw ever
 * reaches the DOM.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { communityCategoryTitle } from "@/i18n/community-category";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowBigUp, Flag, Pencil, Trash2 } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { describeError } from "@/lib/api/error-map";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Avatar, Chip } from "@/components/sa/primitives";
import { CommunityGate } from "./CommunityGate";
import {
  createComment,
  deleteComment,
  deleteCommunityPost,
  fetchCommunityPost,
  fetchPostComments,
  reportComment,
  reportPost,
  updateComment,
  updateCommunityPost,
  voteComment,
  votePost,
} from "./community.api";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { fetchSubscription } from "@/features/plans/plans.api";
import { formatDate, formatRelativeTime } from "@/lib/format/format";

const COMMENT_MAX = 2000;
const REPORT_REASONS = [
  { value: "spam", get label() { return uiText("community:spam_d8628a"); } },
  { value: "harassment", get label() { return uiText("community:harassment_8fddd7"); } },
  { value: "misinformation", get label() { return uiText("community:misinformation_075739"); } },
  { value: "safety", get label() { return uiText("community:safety_concern_f86f99"); } },
  { value: "other", get label() { return uiText("community:other_6e6a6f"); } },
] as const;

export default function PostDetailPage() {
  useInterfaceLocale();
  const { postId } = useParams();
  const parsed = Number(postId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const userId = useCurrentUserId();

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });
  const entitled = subscriptionQuery.data?.entitlements.community === true;

  const postQuery = useQuery({
    queryKey: queryKeys.community.post(userId, parsed),
    queryFn: () => fetchCommunityPost(parsed),
    enabled: entitled && Number.isInteger(parsed) && parsed > 0,
    retry: false,
    staleTime: 30_000,
  });

  const commentsQuery = useInfiniteQuery({
    queryKey: queryKeys.community.comments(userId, parsed),
    queryFn: ({ pageParam }) =>
      fetchPostComments(parsed, { cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.next_cursor ?? undefined,
    enabled: entitled && Number.isInteger(parsed) && parsed > 0,
    staleTime: 30_000,
  });

  const invalidatePost = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.community.post(userId, parsed) });
  const invalidateComments = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.community.comments(userId, parsed) });

  const votePostMutation = useMutation({
    mutationFn: () => votePost(parsed),
    onSuccess: (res) => {
      queryClient.setQueryData<{ vote_score: number; voted_by_me: boolean }>(
        queryKeys.community.post(userId, parsed),
        (old) => (old ? { ...old, vote_score: res.vote_score, voted_by_me: res.voted } : old),
      );
    },
  });

  const voteCommentMutation = useMutation({
    mutationFn: (commentId: number) => voteComment(commentId),
    onSuccess: (res, commentId) => {
      // Update the comment inside the paginated comments cache.
      queryClient.setQueriesData(
        { queryKey: queryKeys.community.comments(userId, parsed) },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const pages = (old as { pages: Array<{ comments: Array<Record<string, unknown>> }> }).pages;
          return {
            ...old,
            pages: pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) =>
                c.comment_id === commentId
                  ? { ...c, vote_score: res.vote_score, voted_by_me: res.voted }
                  : c,
              ),
            })),
          };
        },
      );
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => deleteCommunityPost(parsed),
    onSuccess: () => void navigate("/community", { replace: true }),
    onError: (err) => { setError(describeError(err).title); },
  });

  const updatePostMutation = useMutation({
    mutationFn: (patch: { title?: string; body?: string }) =>
      updateCommunityPost(parsed, patch),
    onSuccess: () => void invalidatePost(),
    onError: (err) => { setError(describeError(err).title); },
  });

  const addCommentMutation = useMutation({
    mutationFn: (body: string) => createComment(parsed, { body }),
    onSuccess: () => {
      void invalidateComments();
      void invalidatePost(); // comment_count lives on the post
    },
    onError: (err) => { setError(describeError(err).title); },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: number; body: string }) =>
      updateComment(commentId, { body }),
    onSuccess: () => void invalidateComments(),
    onError: (err) => { setError(describeError(err).title); },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      void invalidateComments();
      void invalidatePost();
    },
    onError: (err) => { setError(describeError(err).title); },
  });

  const reportPostMutation = useMutation({
    mutationFn: (payload: { reason: string; details?: string }) => reportPost(parsed, payload),
    onError: (err) => { setError(describeError(err).title); },
  });

  const reportCommentMutation = useMutation({
    mutationFn: ({ commentId, payload }: { commentId: number; payload: { reason: string; details?: string } }) =>
      reportComment(commentId, payload),
    onError: (err) => { setError(describeError(err).title); },
  });

  if (!subscriptionQuery.isPending && subscriptionQuery.data && !entitled) {
    return <CommunityGate />;
  }
  if (!entitled) return <PostSkeleton />;

  if (postQuery.isError) {
    if (postQuery.error instanceof ApiError && postQuery.error.code === "COMMUNITY_REQUIRES_PLAN") {
      return <CommunityGate />;
    }
    if (postQuery.error instanceof ApiError && postQuery.error.status === 404) {
      return (
        <EmptyState
          title={uiText("community:this_post_isn_t_available_e47d46")}
          description={uiText("community:it_may_have_been_removed_295468")}
          action={
            <Link
              to="/community"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
            >{uiText("community:back_to_community_4f1597")}</Link>
          }
        />
      );
    }
    return <ErrorState error={postQuery.error} onRetry={() => void postQuery.refetch()} />;
  }
  if (!postQuery.data) return <PostSkeleton />;

  const post = postQuery.data;
  const comments = commentsQuery.data?.pages.flatMap((p) => p.comments) ?? [];
  const hasMore =
    commentsQuery.data?.pages[commentsQuery.data.pages.length - 1]?.pagination
      .has_more ?? false;

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label={uiText("community:breadcrumb_c766e6")} className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to="/community" className="text-muted-foreground hover:text-foreground">{uiText("community:community_1cf6a3")}</Link>
      </nav>

      <article className="rise panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Avatar name={post.author.display_name} size={26} />
          <span className="truncate text-foreground">{post.author.display_name}</span>
          <Chip>{communityCategoryTitle(post.category_code, post.category_name)}</Chip>
          <span className="font-mono" title={formatDate(post.created_at)}>
            {formatRelativeTime(post.created_at)}
          </span>
          {post.updated_at !== post.created_at ? <span>{uiText("community:edited_b27c76")}</span> : null}
        </div>

        <h1 className="mt-4 font-display text-3xl leading-none font-semibold tracking-wide uppercase">
          {post.title}
        </h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <VoteButton
            voted={post.voted_by_me}
            score={post.vote_score}
            pending={votePostMutation.isPending}
            label={uiText("community:vote_on_this_post_eb6350")}
            onClick={() => { votePostMutation.mutate(); }}
          />
          {post.mine ? (
            <>
              <EditPostDialog
                post={post}
                pending={updatePostMutation.isPending}
                onSave={(patch) => { updatePostMutation.mutate(patch); }}
              />
              <ConfirmDelete
                label={uiText("community:delete_f6fdbe")}
                title={uiText("community:delete_this_post_81bc1f")}
                description={uiText("community:comments_are_deleted_with_it_this_cannot_425a8a")}
                pending={deletePostMutation.isPending}
                onConfirm={() => { deletePostMutation.mutate(); }}
              />
            </>
          ) : (
            <ReportButton
              pending={reportPostMutation.isPending}
              onReport={(payload) => { reportPostMutation.mutate(payload); }}
              onReported={() => { setError(null); }}
            />
          )}
        </div>
      </article>

      {error ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="alert">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      {/* ── Comments ── */}
      <section aria-labelledby="comments-heading" className="mt-10">
        <h2 id="comments-heading" className="eyebrow mb-4">{uiText("community:value_comments_c638de", { value0: uiValue(post.comment_count) })}</h2>

        <CommentForm
          pending={addCommentMutation.isPending}
          onSubmit={(body) => { addCommentMutation.mutate(body); }}
        />

        <div className="mt-4">
          {commentsQuery.isPending && comments.length === 0 ? (
            <PostSkeleton />
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{uiText("community:no_comments_yet_start_the_discussion_6d8475")}</p>
          ) : (
            <ul className="grid gap-3">
              {comments.map((comment) => (
                <li key={comment.comment_id}>
                  <CommentItem
                    comment={comment}
                    votePending={voteCommentMutation.isPending}
                    onVote={() => { voteCommentMutation.mutate(comment.comment_id); }}
                    onEdit={(body) =>
                      { updateCommentMutation.mutate({ commentId: comment.comment_id, body }); }
                    }
                    editPending={updateCommentMutation.isPending}
                    onDelete={() => { deleteCommentMutation.mutate(comment.comment_id); }}
                    deletePending={deleteCommentMutation.isPending}
                    onReport={(payload) =>
                      { reportCommentMutation.mutate({ commentId: comment.comment_id, payload }); }
                    }
                    reportPending={reportCommentMutation.isPending}
                  />
                </li>
              ))}
            </ul>
          )}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={commentsQuery.isFetchingNextPage}
                onClick={() => void commentsQuery.fetchNextPage()}
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
              >
                {commentsQuery.isFetchingNextPage ? uiText("community:loading_33ce41") : uiText("community:load_more_comments_fcf82c")}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function VoteButton({
  voted,
  score,
  pending,
  label,
  onClick,
}: {
  voted: boolean;
  score: number;
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  useInterfaceLocale();
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={voted}
      disabled={pending}
      onClick={onClick}
      className={
        voted
          ? "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"
          : "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
      }
    >
      <ArrowBigUp aria-hidden="true" className="size-4" />
      {score}
    </button>
  );
}

function CommentForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (body: string) => void;
}) {
  useInterfaceLocale();
  const [body, setBody] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim().length === 0) return;
        onSubmit(body.trim());
        setBody("");
      }}
      className="panel space-y-2 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor="comment-body">{uiText("community:add_a_comment_3e1836")}</Label>
        <span className="font-mono text-xs text-muted-foreground">
          {body.length}/{COMMENT_MAX}
        </span>
      </div>
      <textarea
        id="comment-body"
        value={body}
        maxLength={COMMENT_MAX}
        onChange={(e) => { setBody(e.target.value); }}
        rows={3}
        placeholder={uiText("community:share_what_you_know_or_ask_a_753ad3")}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
      />
      <button
        type="submit"
        disabled={pending || body.trim().length === 0}
        className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-xs font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? uiText("community:posting_20c00d") : uiText("community:post_comment_92323a")}
      </button>
    </form>
  );
}

function CommentItem({
  comment,
  votePending,
  onVote,
  onEdit,
  editPending,
  onDelete,
  deletePending,
  onReport,
  reportPending,
}: {
  comment: {
    comment_id: number;
    body: string;
    author: { display_name: string; avatar_visible: boolean };
    vote_score: number;
    voted_by_me: boolean;
    mine: boolean;
    created_at: string;
    updated_at: string;
  };
  votePending: boolean;
  onVote: () => void;
  onEdit: (body: string) => void;
  editPending: boolean;
  onDelete: () => void;
  deletePending: boolean;
  onReport: (payload: { reason: string; details?: string }) => void;
  reportPending: boolean;
}) {
  useInterfaceLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  return (
    <div className="panel space-y-2 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar name={comment.author.display_name} size={24} />
        <span className="font-medium text-foreground">
          {comment.author.display_name}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono" title={formatDate(comment.created_at)}>
          {formatRelativeTime(comment.created_at)}
        </span>
        {comment.updated_at !== comment.created_at ? <span>{uiText("community:edited_b27c76")}</span> : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            maxLength={COMMENT_MAX}
            onChange={(e) => { setDraft(e.target.value); }}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={editPending}
              disabled={draft.trim().length === 0}
              onClick={() => {
                onEdit(draft.trim());
                setEditing(false);
              }}
            >{uiText("community:save_efc007")}</Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
            >{uiText("community:cancel_77dfd2")}</Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
        <VoteButton
          voted={comment.voted_by_me}
          score={comment.vote_score}
          pending={votePending}
          label={uiText("community:vote_on_this_comment_6717ce")}
          onClick={onVote}
        />
        {comment.mine ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(true); }}>
              <Pencil aria-hidden="true" className="size-3.5" />{uiText("community:edit_530164")}</Button>
            <ConfirmDelete
              label={uiText("community:delete_f6fdbe")}
              title={uiText("community:delete_this_comment_b88a2b")}
              description={uiText("community:this_cannot_be_undone_ad2526")}
              pending={deletePending}
              onConfirm={onDelete}
              small
            />
          </>
        ) : (
          <ReportButton
            pending={reportPending}
            onReport={onReport}
            small
          />
        )}
      </div>
    </div>
  );
}

function EditPostDialog({
  post,
  pending,
  onSave,
}: {
  post: { title: string; body: string };
  pending: boolean;
  onSave: (patch: { title?: string; body?: string }) => void;
}) {
  useInterfaceLocale();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(true); }}>
        <Pencil aria-hidden="true" className="size-3.5" />{uiText("community:edit_530164")}</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={uiText("community:edit_post_3de7f4")}
        description={uiText("community:plain_text_only_formatting_is_stripped_de1e43")}
      >
        <div className="space-y-3 pt-2">
          <Input
            aria-label={uiText("community:post_title_a1cf72")}
            value={title}
            maxLength={120}
            onChange={(e) => { setTitle(e.target.value); }}
          />
          <textarea
            aria-label={uiText("community:post_body_841db8")}
            value={body}
            maxLength={8000}
            rows={6}
            onChange={(e) => { setBody(e.target.value); }}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setOpen(false); }} disabled={pending}>{uiText("community:cancel_77dfd2")}</Button>
            <Button
              loading={pending}
              disabled={title.trim().length === 0 || body.trim().length === 0}
              onClick={() => {
                onSave({ title: title.trim(), body: body.trim() });
                setOpen(false);
              }}
            >{uiText("community:save_efc007")}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Exported for the community feed (own-post actions). */
export function ReportButton({
  pending,
  onReport,
  onReported,
  small,
}: {
  pending: boolean;
  onReport: (payload: { reason: string; details?: string }) => void;
  onReported?: () => void;
  small?: boolean;
}) {
  useInterfaceLocale();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");

  return (
    <>
      <Button size={small ? "sm" : undefined} variant="ghost" onClick={() => { setOpen(true); }}>
        <Flag aria-hidden="true" className="size-3.5" />{uiText("community:report_ee45c3")}</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={uiText("community:report_this_content_214afe")}
        description={uiText("community:reports_go_to_the_moderation_queue_your_9dd712")}
      >
        <div className="space-y-3 pt-2">
          <select
            aria-label={uiText("community:reason_f219cc")}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => { setReason(e.target.value); }}
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            aria-label={uiText("community:details_optional_138a57")}
            value={details}
            maxLength={300}
            rows={3}
            onChange={(e) => { setDetails(e.target.value); }}
            placeholder={uiText("community:what_s_wrong_optional_7ef748")}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setOpen(false); }} disabled={pending}>{uiText("community:cancel_77dfd2")}</Button>
            <Button
              loading={pending}
              onClick={() => {
                onReport({ reason, details: details.trim() || undefined });
                setOpen(false);
                setDetails("");
                onReported?.();
              }}
            >{uiText("community:send_report_a5b32a")}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Exported for the community feed (own-post actions). */
export function ConfirmDelete({
  label,
  title,
  description,
  pending,
  onConfirm,
  small,
}: {
  label: string;
  title: string;
  description: string;
  pending: boolean;
  onConfirm: () => void;
  small?: boolean;
}) {
  useInterfaceLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size={small ? "sm" : undefined} variant="ghost" onClick={() => { setOpen(true); }}>
        <Trash2 aria-hidden="true" className="size-3.5" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={title} description={description}>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => { setOpen(false); }} disabled={pending}>{uiText("community:cancel_77dfd2")}</Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >{uiText("community:delete_f6fdbe")}</Button>
        </div>
      </Dialog>
    </>
  );
}

function PostSkeleton() {
  useInterfaceLocale();
  return (
    <div role="status" aria-label={uiText("community:loading_post_e26c95")} className="space-y-4">
      <div className="panel h-8 w-2/3 animate-pulse" aria-hidden="true" />
      <div className="panel h-40 animate-pulse" aria-hidden="true" />
    </div>
  );
}
