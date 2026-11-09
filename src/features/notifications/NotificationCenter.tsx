import { useId, useState } from "react";
import { Link } from "react-router";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, CheckCheck, CircleHelp, MessageCircle, RefreshCw, Trophy } from "lucide-react";
import { tr as t, useLocale } from "@/i18n";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { queryKeys } from "@/lib/api/keys";
import { formatRelativeTime } from "@/lib/format/format";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/components/sa/primitives";
import { fetchNotifications, markNotificationsRead } from "./notifications.api";

const kinds = {
  lesson_completed: { key: "navigation:notificationLesson", Icon: BookOpen },
  quiz_completed: { key: "navigation:notificationQuiz", Icon: CircleHelp },
  achievement: { key: "navigation:notificationAchievement", Icon: Trophy },
  community_reply: { key: "navigation:notificationReply", Icon: MessageCircle },
} as const;

export function NotificationCenter() {
  useLocale();
  const userId = useCurrentUserId();
  const client = useQueryClient();
  const countId = useId();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.notifications.feed(userId), queryFn: fetchNotifications,
    enabled: userId > 0, staleTime: 15_000, refetchInterval: 60_000, retry: false,
  });
  const read = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all(userId) }),
    onError: () => { useUiStore.getState().pushToast({ tone: "error", get title() { return t("navigation:notificationSaveError"); } }); },
  });
  const unread = query.data?.unread_count ?? 0;
  const items = query.data?.items ?? [];
  const unreadIds = items.filter(item => item.read_at === null).map(item => item.notification_id);

  return (
    <Menu.Root open={open} onOpenChange={next => { setOpen(next); if (next && userId > 0) void query.refetch(); }}>
      <Menu.Trigger asChild>
        <button type="button" aria-label={t("navigation:notifications_753a22")} aria-describedby={unread ? countId : undefined}
          className="relative grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground data-[state=open]:border-primary/50 data-[state=open]:text-primary">
          <Bell className="size-4" aria-hidden="true" />
          {unread > 0 && <><span data-testid="notification-unread" aria-hidden="true" className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold text-primary-foreground">{unread}</span><span id={countId} className="sr-only">{t("navigation:notificationUnread", { count: unread })}</span></>}
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} collisionPadding={{ top: 12, left: 12, right: 12, bottom: 88 }} aria-label={t("navigation:notifications_753a22")}
          className="z-[var(--z-popover)] max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elevated)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <Menu.Label className="font-display text-xl font-semibold uppercase">{t("navigation:notifications_753a22")}</Menu.Label>
            <Menu.Item disabled={unreadIds.length === 0 || read.isPending} onSelect={event => { event.preventDefault(); read.mutate(unreadIds); }}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-xs font-semibold text-primary outline-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-40">
              <CheckCheck className="size-4" aria-hidden="true" />{read.isPending ? t("navigation:notificationSaving") : t("navigation:notificationMarkAll")}
            </Menu.Item>
          </div>
          {query.isPending ? <p role="status" className="p-6 text-sm text-muted-foreground">{t("navigation:notificationLoading")}</p>
            : query.isError ? <div className="p-4"><p role="alert" className="text-sm text-muted-foreground">{t("navigation:notificationLoadError")}</p><Menu.Item onSelect={event => { event.preventDefault(); void query.refetch(); }} className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-primary outline-none focus:bg-accent"><RefreshCw className="size-4" aria-hidden="true" />{t("navigation:notificationRetry")}</Menu.Item></div>
            : items.length === 0 ? <div className="px-5 py-9 text-center"><Bell className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden="true" /><p className="font-semibold">{t("navigation:notificationEmpty")}</p><p className="mt-2 text-sm text-muted-foreground">{t("navigation:notificationEmptyDetail")}</p></div>
            : items.map(item => {
              const { Icon, key } = kinds[item.kind];
              return <Menu.Item key={item.notification_id} asChild onSelect={() => { if (item.read_at === null) read.mutate([item.notification_id]); }}>
                <Link to={item.target} className={cn("flex min-h-20 items-start gap-3 border-b border-border/60 p-4 outline-none last:border-b-0 hover:bg-accent focus:bg-accent", item.read_at === null && "bg-primary/5")}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(key)}</span>{item.subject && <span className="mt-1 block break-words text-sm text-muted-foreground">{item.subject.title}</span>}<time dateTime={item.at} className="mt-2 block text-xs text-muted-foreground">{formatRelativeTime(item.at)}</time></span>
                  {item.read_at === null && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-label={t("navigation:notificationNew")} />}
                </Link>
              </Menu.Item>;
            })}
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{t("navigation:notificationRecent")}</p>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
