import type { OrgId } from "./ids";

export type NotificationMessageId = string & {
  readonly __brand: "NotificationMessageId";
};

export function notificationMessageId(id: string): NotificationMessageId {
  return id as NotificationMessageId;
}

export type NotificationChannelKind = "in_app" | "email";
export type NotificationStatus = "queued" | "delivered" | "failed";
export type NotificationTopic =
  | "community.report"
  | "community.moderation"
  | "event.published"
  | "event.updated"
  | "event.canceled"
  | "event.rsvp";

export interface NotificationMessage {
  id: NotificationMessageId;
  organizationId: OrgId;
  userId: string;
  channel: NotificationChannelKind;
  topic: NotificationTopic;
  title: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  version: number;
}
