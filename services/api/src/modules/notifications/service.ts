import type {
  NotificationMessage,
  NotificationMessageId,
  NotificationChannelKind,
  NotificationTopic,
  NotificationStatus,
  OrgId,
} from "@club-os/domain-core";
import {
  notificationMessageId,
  ok,
  err,
  type Result,
} from "@club-os/domain-core";

// --- Channel abstraction ---

export interface NotificationChannel {
  kind: NotificationChannelKind;
  send(notification: NotificationMessage): Promise<boolean>;
}

export class InAppNotificationChannel implements NotificationChannel {
  kind: NotificationChannelKind = "in_app";

  async send(notification: NotificationMessage): Promise<boolean> {
    // In-app channel: notification is already stored by the service.
    // This is a no-op; delivery is implicit for in_app.
    return true;
  }
}

export class FakeEmailNotificationChannel implements NotificationChannel {
  kind: NotificationChannelKind = "email";
  sentMessages: NotificationMessage[] = [];

  async send(notification: NotificationMessage): Promise<boolean> {
    this.sentMessages.push(notification);
    return true;
  }

  reset(): void {
    this.sentMessages = [];
  }
}

// --- Dispatcher ---

export interface NotificationDispatcherConfig {
  channels: NotificationChannel[];
}

export class NotificationDispatcher {
  private channels: Map<NotificationChannelKind, NotificationChannel>;

  constructor(config: NotificationDispatcherConfig) {
    this.channels = new Map();
    for (const channel of config.channels) {
      this.channels.set(channel.kind, channel);
    }
  }

  async dispatch(notification: NotificationMessage): Promise<boolean> {
    const channel = this.channels.get(notification.channel);
    if (!channel) return false;

    try {
      return await channel.send(notification);
    } catch {
      // Channel failures do not break primary business action.
      // In a real system we'd log/metric this.
      return false;
    }
  }
}

// --- Notification service ---

export class NotificationService {
  private notifications = new Map<string, NotificationMessage>();
  private dispatcher: NotificationDispatcher | null = null;

  setDispatcher(dispatcher: NotificationDispatcher): void {
    this.dispatcher = dispatcher;
  }

  reset(): void {
    this.notifications.clear();
  }

  async createNotification(input: {
    organizationId: OrgId;
    userId: string;
    channel: NotificationChannelKind;
    topic: NotificationTopic;
    title: string;
    body: string;
    metadata?: Record<string, string>;
  }): Promise<NotificationMessage> {
    const now = new Date().toISOString();
    const notification: NotificationMessage = {
      id: notificationMessageId(crypto.randomUUID()),
      organizationId: input.organizationId,
      userId: input.userId,
      channel: input.channel,
      topic: input.topic,
      title: input.title,
      body: input.body,
      status: "queued" as NotificationStatus,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      deliveredAt: null,
      readAt: null,
      version: 1,
    };

    this.notifications.set(notification.id, notification);

    // Dispatch (fire-and-forget; failure doesn't affect caller)
    if (this.dispatcher) {
      const success = await this.dispatcher.dispatch(notification);
      if (success) {
        const delivered: NotificationMessage = {
          ...notification,
          status: "delivered",
          deliveredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 2,
        };
        this.notifications.set(delivered.id, delivered);
        return delivered;
      }
    }

    return notification;
  }

  listMyNotifications(
    userId: string,
    organizationId: OrgId,
  ): NotificationMessage[] {
    return [...this.notifications.values()]
      .filter(
        (n) =>
          n.userId === userId &&
          n.organizationId === organizationId &&
          n.channel === "in_app",
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  getNotificationUnscoped(
    id: NotificationMessageId,
  ): NotificationMessage | undefined {
    return this.notifications.get(id);
  }

  markAsRead(
    id: NotificationMessageId,
    userId: string,
    organizationId: OrgId,
  ): Result<NotificationMessage, string> {
    const notification = this.notifications.get(id);
    if (!notification) return err("Notification not found");
    if (
      notification.userId !== userId ||
      notification.organizationId !== organizationId
    ) {
      return err("Notification not found");
    }
    if (notification.readAt) return ok(notification);

    const now = new Date().toISOString();
    const updated: NotificationMessage = {
      ...notification,
      readAt: now,
      updatedAt: now,
      version: notification.version + 1,
    };
    this.notifications.set(updated.id, updated);
    return ok(updated);
  }
}
