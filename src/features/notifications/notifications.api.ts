import { request } from "@/lib/api/client";
import type { paths } from "@/types/api";

export type NotificationsResponse = paths["/api/v1/notifications"]["get"]["responses"][200]["content"]["application/json"];
export function fetchNotifications(): Promise<NotificationsResponse> {
  return request<NotificationsResponse>("/notifications");
}
export function markNotificationsRead(notificationIds: string[]): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/notifications/read", { method: "POST", body: { notification_ids: notificationIds } });
}
