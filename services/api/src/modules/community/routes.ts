import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { CommunityService } from "./service";
import type {
  CommunityPostId,
  CommunityCommentId,
  CommunityReportId,
  OrgId,
  ReportTargetType,
} from "@club-os/domain-core";
import type { NotificationService } from "../notifications/service";

const communityService = new CommunityService();

interface CommunityRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  notificationService?: NotificationService;
}

function getCommunityAuthHandler(
  options?: CommunityRoutesOptions,
): MiddlewareHandler {
  if (options?.authHandler) return options.authHandler;
  if (options?.auth === "mock") return mockAuthMiddleware;
  return getDefaultAuthHandler();
}

async function readJsonBody<T>(
  c: Context,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const body = await c.req.json<T>();
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

function extractPostResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const post = communityService.getPostUnscoped(id as CommunityPostId);
  return {
    id,
    organizationId: post
      ? post.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function extractCommentResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const comment = communityService.getCommentUnscoped(
    id as CommunityCommentId,
  );
  return {
    id,
    organizationId: comment
      ? comment.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function extractReportResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const report = communityService.getReportUnscoped(id as CommunityReportId);
  return {
    id,
    organizationId: report
      ? report.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function isMemberVisiblePostStatus(status: string): boolean {
  return status === "visible" || status === "locked";
}

function statusForCommunityPostUpdateError(
  error: string,
): 400 | 403 | 404 {
  if (error === "Post not found") return 404;
  if (error === "Only author or moderator can edit this post") return 403;
  return 400;
}

export function communityRoutes(
  app: Hono,
  options?: CommunityRoutesOptions,
): void {
  const notifService = options?.notificationService;

  async function notifyReportCreated(
    report: {
      id: string;
      organizationId: OrgId;
      reportedByUserId: string;
      targetType: string;
      targetId: string;
      reasonCode: string;
    },
  ): Promise<void> {
    if (!notifService) return;
    try {
      await notifService.createNotification({
        organizationId: report.organizationId,
        userId: report.reportedByUserId,
        channel: "in_app",
        topic: "community.report",
        title: "Report submitted",
        body: `Your ${report.targetType} report (${report.reasonCode}) has been received.`,
        metadata: {
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
        },
      });
    } catch {
      // Notification failures do not block the primary workflow.
    }
  }

  async function notifyReportOutcome(
    report: {
      id: string;
      organizationId: OrgId;
      reportedByUserId: string;
      status: string;
      targetType: string;
      targetId: string;
    },
  ): Promise<void> {
    if (!notifService) return;
    try {
      await notifService.createNotification({
        organizationId: report.organizationId,
        userId: report.reportedByUserId,
        channel: "in_app",
        topic: "community.moderation",
        title:
          report.status === "resolved"
            ? "Report resolved"
            : "Report dismissed",
        body: `Your report on a ${report.targetType} has been ${report.status}.`,
        metadata: {
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          reportStatus: report.status,
        },
      });
    } catch {
      // Notification failures do not block the primary workflow.
    }
  }

  // --- Member/community routes ---
  const community = new Hono();
  community.use("*", getCommunityAuthHandler(options));

  // List posts
  community.get(
    "/posts",
    requireCapability("community.read", "community-post"),
    async (c) => {
      const session = c.get("session")!;
      const posts = communityService
        .listPosts(session.organizationId as OrgId)
        .filter((post) => isMemberVisiblePostStatus(post.status));
      return c.json({ data: posts });
    },
  );

  // Create post
  community.post(
    "/posts",
    requireCapability("community.write", "community-post"),
    async (c) => {
      const parsedBody = await readJsonBody<{
        title?: string;
        body?: string;
        tags?: string[];
      }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = communityService.createPost({
        authorUserId: session.userId,
        organizationId: session.organizationId as OrgId,
        title: parsedBody.value.title ?? "",
        body: parsedBody.value.body ?? "",
        tags: parsedBody.value.tags,
      });
      if (!result.ok) return c.json({ error: result.error }, 400);
      return c.json({ data: result.value }, 201);
    },
  );

  // Get post
  community.get(
    "/posts/:id",
    requireCapability("community.read", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.getPost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);
      if (!isMemberVisiblePostStatus(result.value.status)) {
        return c.json({ error: "Post not found" }, 404);
      }
      return c.json({ data: result.value });
    },
  );

  // Update post (author or moderator)
  community.patch(
    "/posts/:id",
    requireCapability("community.write", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{
        title?: string;
        body?: string;
        tags?: string[];
      }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const capabilities = c.get("requestContext")?.capabilities ?? [];
      const isManagement = capabilities.includes("community.moderate");

      const result = communityService.updatePost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
        session.userId,
        isManagement,
        parsedBody.value,
      );
      if (!result.ok) {
        const status = statusForCommunityPostUpdateError(result.error);
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // List comments for a post
  community.get(
    "/posts/:id/comments",
    requireCapability("community.read", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const post = communityService.getPost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      if (!post.ok) return c.json({ error: post.error }, 404);
      if (!isMemberVisiblePostStatus(post.value.status)) {
        return c.json({ error: "Post not found" }, 404);
      }
      const comments = communityService.listComments(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      return c.json({ data: comments });
    },
  );

  // Create comment
  community.post(
    "/posts/:id/comments",
    requireCapability("community.comment", "community-comment", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{ body?: string }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = communityService.createComment({
        postId: c.req.param("id") as CommunityPostId,
        authorUserId: session.userId,
        organizationId: session.organizationId as OrgId,
        body: parsedBody.value.body ?? "",
      });
      if (!result.ok) {
        const status = result.error === "Post not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value }, 201);
    },
  );

  // Report a post
  community.post(
    "/posts/:id/report",
    requireCapability("community.report", "community-report", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{
        reasonCode?: string;
        details?: string;
      }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = communityService.createReport({
        organizationId: session.organizationId as OrgId,
        targetType: "post" as ReportTargetType,
        targetId: c.req.param("id"),
        reportedByUserId: session.userId,
        reasonCode: parsedBody.value.reasonCode ?? "",
        details: parsedBody.value.details ?? null,
      });
      if (!result.ok) return c.json({ error: result.error }, 400);
      await notifyReportCreated(result.value);
      return c.json({ data: result.value }, 201);
    },
  );

  // Report a comment
  community.post(
    "/comments/:id/report",
    requireCapability("community.report", "community-report", {
      extractResource: extractCommentResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{
        reasonCode?: string;
        details?: string;
      }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = communityService.createReport({
        organizationId: session.organizationId as OrgId,
        targetType: "comment" as ReportTargetType,
        targetId: c.req.param("id"),
        reportedByUserId: session.userId,
        reasonCode: parsedBody.value.reasonCode ?? "",
        details: parsedBody.value.details ?? null,
      });
      if (!result.ok) return c.json({ error: result.error }, 400);
      await notifyReportCreated(result.value);
      return c.json({ data: result.value }, 201);
    },
  );

  app.route("/api/community", community);

  // --- Admin/moderation routes ---
  const admin = new Hono();
  admin.use("*", getCommunityAuthHandler(options));

  // List reports
  admin.get(
    "/community/reports",
    requireCapability("community.moderate", "community-report"),
    async (c) => {
      const session = c.get("session")!;
      const reports = communityService.listReports(
        session.organizationId as OrgId,
      );
      return c.json({ data: reports });
    },
  );

  // Get report detail
  admin.get(
    "/community/reports/:id",
    requireCapability("community.moderate", "community-report", {
      extractResource: extractReportResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.getReport(
        c.req.param("id") as CommunityReportId,
        session.organizationId as OrgId,
      );
      if (!result.ok) return c.json({ error: result.error }, 404);
      return c.json({ data: result.value });
    },
  );

  // Triage report
  admin.post(
    "/community/reports/:id/triage",
    requireCapability("community.moderate", "community-report", {
      extractResource: extractReportResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.triageReport(
        c.req.param("id") as CommunityReportId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Report not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      await notifyReportOutcome(result.value);
      return c.json({ data: result.value });
    },
  );

  // Resolve report
  admin.post(
    "/community/reports/:id/resolve",
    requireCapability("community.moderate", "community-report", {
      extractResource: extractReportResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{ notes?: string }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = communityService.resolveReport(
        c.req.param("id") as CommunityReportId,
        session.organizationId as OrgId,
        session.userId,
        parsedBody.value.notes ?? null,
      );
      if (!result.ok) {
        const status = result.error === "Report not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      await notifyReportOutcome(result.value);
      return c.json({ data: result.value });
    },
  );

  // Dismiss report
  admin.post(
    "/community/reports/:id/dismiss",
    requireCapability("community.moderate", "community-report", {
      extractResource: extractReportResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<{ notes?: string }>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const session = c.get("session")!;
      const result = communityService.dismissReport(
        c.req.param("id") as CommunityReportId,
        session.organizationId as OrgId,
        session.userId,
        parsedBody.value.notes ?? null,
      );
      if (!result.ok) {
        const status = result.error === "Report not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // Moderation actions on posts
  admin.post(
    "/community/posts/:id/hide",
    requireCapability("community.moderate", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.hidePost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Post not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  admin.post(
    "/community/posts/:id/unhide",
    requireCapability("community.moderate", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.unhidePost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status =
          result.error === "Post not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  admin.post(
    "/community/posts/:id/lock",
    requireCapability("community.moderate", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.lockPost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Post not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  admin.post(
    "/community/posts/:id/unlock",
    requireCapability("community.moderate", "community-post", {
      extractResource: extractPostResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.unlockPost(
        c.req.param("id") as CommunityPostId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Post not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  // Moderation actions on comments
  admin.post(
    "/community/comments/:id/hide",
    requireCapability("community.moderate", "community-comment", {
      extractResource: extractCommentResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.hideComment(
        c.req.param("id") as CommunityCommentId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Comment not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  admin.post(
    "/community/comments/:id/unhide",
    requireCapability("community.moderate", "community-comment", {
      extractResource: extractCommentResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = communityService.unhideComment(
        c.req.param("id") as CommunityCommentId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        const status = result.error === "Comment not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: result.value });
    },
  );

  app.route("/api/admin", admin);
}

export { communityService, CommunityService };
