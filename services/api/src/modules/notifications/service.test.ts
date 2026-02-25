import { describe, it, expect, beforeEach } from "vitest";
import {
  NotificationService,
  NotificationDispatcher,
  InAppNotificationChannel,
  FakeEmailNotificationChannel,
  type NotificationChannel,
} from "./service";
import type { OrgId, NotificationChannelKind } from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;

describe("NotificationService", () => {
  let service: NotificationService;
  let fakeEmail: FakeEmailNotificationChannel;

  beforeEach(() => {
    service = new NotificationService();
    fakeEmail = new FakeEmailNotificationChannel();
    const dispatcher = new NotificationDispatcher({
      channels: [new InAppNotificationChannel(), fakeEmail],
    });
    service.setDispatcher(dispatcher);
  });

  it("creates an in-app notification", async () => {
    const notif = await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "in_app",
      topic: "community.report",
      title: "New Report",
      body: "A post was reported",
    });
    expect(notif.id).toBeTruthy();
    expect(notif.status).toBe("delivered");
    expect(notif.channel).toBe("in_app");
  });

  it("creates an email notification (dispatched to fake channel)", async () => {
    const notif = await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "email",
      topic: "event.published",
      title: "New Event",
      body: "A new event was published",
    });
    expect(notif.status).toBe("delivered");
    expect(fakeEmail.sentMessages).toHaveLength(1);
    expect(fakeEmail.sentMessages[0].topic).toBe("event.published");
  });

  it("lists in-app notifications for user", async () => {
    await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "in_app",
      topic: "community.report",
      title: "N1",
      body: "b",
    });
    await service.createNotification({
      organizationId: ORG1,
      userId: "u2",
      channel: "in_app",
      topic: "community.report",
      title: "N2",
      body: "b",
    });
    await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "email",
      topic: "event.published",
      title: "N3",
      body: "b",
    });

    const items = service.listMyNotifications("u1", ORG1);
    expect(items).toHaveLength(1); // Only in_app
    expect(items[0].title).toBe("N1");
  });

  it("marks notification as read", async () => {
    const notif = await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "in_app",
      topic: "community.moderation",
      title: "Resolved",
      body: "b",
    });

    const result = service.markAsRead(notif.id, "u1", ORG1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readAt).toBeTruthy();
    }
  });

  it("markAsRead denies cross-user access", async () => {
    const notif = await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "in_app",
      topic: "community.moderation",
      title: "T",
      body: "b",
    });

    const result = service.markAsRead(notif.id, "u2", ORG1);
    expect(result.ok).toBe(false);
  });

  it("markAsRead denies cross-org access", async () => {
    const notif = await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "in_app",
      topic: "community.moderation",
      title: "T",
      body: "b",
    });

    const result = service.markAsRead(notif.id, "u1", ORG2);
    expect(result.ok).toBe(false);
  });

  it("channel failure does not break notification creation", async () => {
    const failingChannel: NotificationChannel = {
      kind: "in_app" as NotificationChannelKind,
      async send() {
        throw new Error("Channel failure");
      },
    };
    const failDispatcher = new NotificationDispatcher({
      channels: [failingChannel],
    });
    service.setDispatcher(failDispatcher);

    // Should not throw
    const notif = await service.createNotification({
      organizationId: ORG1,
      userId: "u1",
      channel: "in_app",
      topic: "event.rsvp",
      title: "Test",
      body: "b",
    });
    expect(notif.id).toBeTruthy();
    // Status remains queued because delivery failed
    expect(notif.status).toBe("queued");
  });
});
