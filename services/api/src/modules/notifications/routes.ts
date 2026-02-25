import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import {
  NotificationService,
  NotificationDispatcher,
  InAppNotificationChannel,
  FakeEmailNotificationChannel,
} from "./service";
import type { NotificationMessageId, OrgId } from "@club-os/domain-core";

const inAppChannel = new InAppNotificationChannel();
const fakeEmailChannel = new FakeEmailNotificationChannel();
const dispatcher = new NotificationDispatcher({
  channels: [inAppChannel, fakeEmailChannel],
});

const notificationService = new NotificationService();
notificationService.setDispatcher(dispatcher);

interface NotificationRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
}

function getNotificationAuthHandler(
  options?: NotificationRoutesOptions,
): MiddlewareHandler {
  if (options?.authHandler) return options.authHandler;
  if (options?.auth === "mock") return mockAuthMiddleware;
  return getDefaultAuthHandler();
}

function extractNotificationResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const notification = notificationService.getNotificationUnscoped(
    id as NotificationMessageId,
  );
  return {
    id,
    organizationId: notification
      ? notification.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

export function notificationRoutes(
  app: Hono,
  options?: NotificationRoutesOptions,
): void {
  const notifications = new Hono();
  notifications.use("*", getNotificationAuthHandler(options));

  // List my notifications
  notifications.get(
    "/my",
    requireCapability("notifications.read", "notification"),
    async (c) => {
      const session = c.get("session")!;
      const items = notificationService.listMyNotifications(
        session.userId,
        session.organizationId as OrgId,
      );
      return c.json({ data: items });
    },
  );

  // Mark notification as read
  notifications.post(
    "/:id/read",
    requireCapability("notifications.read", "notification", {
      extractResource: extractNotificationResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = notificationService.markAsRead(
        c.req.param("id") as NotificationMessageId,
        session.userId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);
      return c.json({ data: result.value });
    },
  );

  app.route("/api/notifications", notifications);
}

export {
  notificationService,
  NotificationService,
  fakeEmailChannel,
  dispatcher,
};
