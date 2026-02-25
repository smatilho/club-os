import type {
  CommunityPost,
  CommunityPostId,
  CommunityComment,
  CommunityCommentId,
  CommunityReport,
  CommunityReportId,
  ModerationStatus,
  ReportReasonCode,
  ReportStatus,
  ReportTargetType,
  OrgId,
} from "@club-os/domain-core";
import {
  communityPostId,
  communityCommentId,
  communityReportId,
  ok,
  err,
  type Result,
} from "@club-os/domain-core";

const VALID_REASON_CODES: ReportReasonCode[] = [
  "spam",
  "abuse",
  "harassment",
  "unsafe",
  "other",
];

const TAG_RE = /^[a-z0-9-]+$/;

function normalizeTags(tags: unknown[]): string[] {
  return tags
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.toLowerCase().trim())
    .filter((t) => TAG_RE.test(t));
}

export class CommunityService {
  private posts = new Map<string, CommunityPost>();
  private comments = new Map<string, CommunityComment>();
  private reports = new Map<string, CommunityReport>();

  reset(): void {
    this.posts.clear();
    this.comments.clear();
    this.reports.clear();
  }

  // --- Posts ---

  createPost(input: {
    authorUserId: string;
    organizationId: OrgId;
    title: string;
    body: string;
    tags?: string[];
  }): Result<CommunityPost, string> {
    if (!input.title || input.title.trim() === "") {
      return err("title is required");
    }
    if (!input.body || input.body.trim() === "") {
      return err("body is required");
    }

    const now = new Date().toISOString();
    const post: CommunityPost = {
      id: communityPostId(crypto.randomUUID()),
      organizationId: input.organizationId,
      authorUserId: input.authorUserId,
      title: input.title.trim(),
      body: input.body,
      tags: normalizeTags(input.tags ?? []),
      status: "visible",
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.posts.set(post.id, post);
    return ok(post);
  }

  getPost(
    id: CommunityPostId,
    organizationId: OrgId,
  ): Result<CommunityPost, string> {
    const post = this.posts.get(id);
    if (!post) return err("Post not found");
    if (post.organizationId !== organizationId) return err("Post not found");
    return ok(post);
  }

  getPostUnscoped(id: CommunityPostId): CommunityPost | undefined {
    return this.posts.get(id);
  }

  listPosts(organizationId: OrgId): CommunityPost[] {
    return [...this.posts.values()]
      .filter((p) => p.organizationId === organizationId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  updatePost(
    id: CommunityPostId,
    organizationId: OrgId,
    userId: string,
    isManagement: boolean,
    input: { title?: string; body?: string; tags?: string[] },
  ): Result<CommunityPost, string> {
    const post = this.posts.get(id);
    if (!post) return err("Post not found");
    if (post.organizationId !== organizationId) return err("Post not found");

    // Only author or moderator can edit
    if (post.authorUserId !== userId && !isManagement) {
      return err("Only author or moderator can edit this post");
    }

    if (input.title !== undefined && input.title.trim() === "") {
      return err("title must not be empty");
    }
    if (input.body !== undefined && input.body.trim() === "") {
      return err("body must not be empty");
    }

    const now = new Date().toISOString();
    const updated: CommunityPost = {
      ...post,
      title: input.title !== undefined ? input.title.trim() : post.title,
      body: input.body !== undefined ? input.body : post.body,
      tags: input.tags !== undefined ? normalizeTags(input.tags) : post.tags,
      updatedAt: now,
      version: post.version + 1,
    };

    this.posts.set(updated.id, updated);
    return ok(updated);
  }

  // --- Moderation actions on posts ---

  hidePost(
    id: CommunityPostId,
    organizationId: OrgId,
  ): Result<CommunityPost, string> {
    const post = this.posts.get(id);
    if (!post) return err("Post not found");
    if (post.organizationId !== organizationId) return err("Post not found");
    if (post.status === "deleted") return err("Cannot hide a deleted post");

    const now = new Date().toISOString();
    const updated: CommunityPost = {
      ...post,
      status: "hidden",
      updatedAt: now,
      version: post.version + 1,
    };
    this.posts.set(updated.id, updated);
    return ok(updated);
  }

  unhidePost(
    id: CommunityPostId,
    organizationId: OrgId,
  ): Result<CommunityPost, string> {
    const post = this.posts.get(id);
    if (!post) return err("Post not found");
    if (post.organizationId !== organizationId) return err("Post not found");
    if (post.status !== "hidden") return err("Post is not hidden");

    const now = new Date().toISOString();
    const updated: CommunityPost = {
      ...post,
      status: "visible",
      updatedAt: now,
      version: post.version + 1,
    };
    this.posts.set(updated.id, updated);
    return ok(updated);
  }

  lockPost(
    id: CommunityPostId,
    organizationId: OrgId,
  ): Result<CommunityPost, string> {
    const post = this.posts.get(id);
    if (!post) return err("Post not found");
    if (post.organizationId !== organizationId) return err("Post not found");
    if (post.status === "deleted") return err("Cannot lock a deleted post");

    const now = new Date().toISOString();
    const updated: CommunityPost = {
      ...post,
      status: "locked",
      updatedAt: now,
      version: post.version + 1,
    };
    this.posts.set(updated.id, updated);
    return ok(updated);
  }

  unlockPost(
    id: CommunityPostId,
    organizationId: OrgId,
  ): Result<CommunityPost, string> {
    const post = this.posts.get(id);
    if (!post) return err("Post not found");
    if (post.organizationId !== organizationId) return err("Post not found");
    if (post.status !== "locked") return err("Post is not locked");

    const now = new Date().toISOString();
    const updated: CommunityPost = {
      ...post,
      status: "visible",
      updatedAt: now,
      version: post.version + 1,
    };
    this.posts.set(updated.id, updated);
    return ok(updated);
  }

  // --- Comments ---

  createComment(input: {
    postId: CommunityPostId;
    authorUserId: string;
    organizationId: OrgId;
    body: string;
  }): Result<CommunityComment, string> {
    if (!input.body || input.body.trim() === "") {
      return err("body is required");
    }

    const post = this.posts.get(input.postId);
    if (!post) return err("Post not found");
    if (post.organizationId !== input.organizationId)
      return err("Post not found");

    // Cannot comment on hidden, locked, or deleted posts
    if (post.status === "hidden")
      return err("Cannot comment on a hidden post");
    if (post.status === "locked")
      return err("Cannot comment on a locked post");
    if (post.status === "deleted")
      return err("Cannot comment on a deleted post");

    const now = new Date().toISOString();
    const comment: CommunityComment = {
      id: communityCommentId(crypto.randomUUID()),
      organizationId: input.organizationId,
      postId: input.postId,
      authorUserId: input.authorUserId,
      body: input.body,
      status: "visible",
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.comments.set(comment.id, comment);

    // Increment comment count
    const updatedPost: CommunityPost = {
      ...post,
      commentCount: post.commentCount + 1,
      updatedAt: now,
      version: post.version + 1,
    };
    this.posts.set(updatedPost.id, updatedPost);

    return ok(comment);
  }

  listComments(
    postId: CommunityPostId,
    organizationId: OrgId,
  ): CommunityComment[] {
    return [...this.comments.values()]
      .filter(
        (c) =>
          c.postId === postId && c.organizationId === organizationId,
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  getComment(
    id: CommunityCommentId,
    organizationId: OrgId,
  ): Result<CommunityComment, string> {
    const comment = this.comments.get(id);
    if (!comment) return err("Comment not found");
    if (comment.organizationId !== organizationId)
      return err("Comment not found");
    return ok(comment);
  }

  getCommentUnscoped(id: CommunityCommentId): CommunityComment | undefined {
    return this.comments.get(id);
  }

  hideComment(
    id: CommunityCommentId,
    organizationId: OrgId,
  ): Result<CommunityComment, string> {
    const comment = this.comments.get(id);
    if (!comment) return err("Comment not found");
    if (comment.organizationId !== organizationId)
      return err("Comment not found");
    if (comment.status === "deleted")
      return err("Cannot hide a deleted comment");

    const now = new Date().toISOString();
    const updated: CommunityComment = {
      ...comment,
      status: "hidden",
      updatedAt: now,
      version: comment.version + 1,
    };
    this.comments.set(updated.id, updated);
    return ok(updated);
  }

  unhideComment(
    id: CommunityCommentId,
    organizationId: OrgId,
  ): Result<CommunityComment, string> {
    const comment = this.comments.get(id);
    if (!comment) return err("Comment not found");
    if (comment.organizationId !== organizationId)
      return err("Comment not found");
    if (comment.status !== "hidden") return err("Comment is not hidden");

    const now = new Date().toISOString();
    const updated: CommunityComment = {
      ...comment,
      status: "visible",
      updatedAt: now,
      version: comment.version + 1,
    };
    this.comments.set(updated.id, updated);
    return ok(updated);
  }

  // --- Reports ---

  createReport(input: {
    organizationId: OrgId;
    targetType: ReportTargetType;
    targetId: string;
    reportedByUserId: string;
    reasonCode: string;
    details?: string | null;
  }): Result<CommunityReport, string> {
    if (!VALID_REASON_CODES.includes(input.reasonCode as ReportReasonCode)) {
      return err(
        `Invalid reasonCode. Must be one of: ${VALID_REASON_CODES.join(", ")}`,
      );
    }

    // Verify target exists and belongs to org
    if (input.targetType === "post") {
      const post = this.posts.get(input.targetId);
      if (!post || post.organizationId !== input.organizationId) {
        return err("Target post not found");
      }
    } else if (input.targetType === "comment") {
      const comment = this.comments.get(input.targetId);
      if (!comment || comment.organizationId !== input.organizationId) {
        return err("Target comment not found");
      }
    } else {
      return err("Invalid targetType");
    }

    const now = new Date().toISOString();
    const report: CommunityReport = {
      id: communityReportId(crypto.randomUUID()),
      organizationId: input.organizationId,
      targetType: input.targetType,
      targetId: input.targetId,
      reportedByUserId: input.reportedByUserId,
      reasonCode: input.reasonCode as ReportReasonCode,
      details: input.details ?? null,
      status: "open",
      resolutionNotes: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.reports.set(report.id, report);
    return ok(report);
  }

  getReport(
    id: CommunityReportId,
    organizationId: OrgId,
  ): Result<CommunityReport, string> {
    const report = this.reports.get(id);
    if (!report) return err("Report not found");
    if (report.organizationId !== organizationId)
      return err("Report not found");
    return ok(report);
  }

  getReportUnscoped(id: CommunityReportId): CommunityReport | undefined {
    return this.reports.get(id);
  }

  listReports(organizationId: OrgId): CommunityReport[] {
    return [...this.reports.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  triageReport(
    id: CommunityReportId,
    organizationId: OrgId,
  ): Result<CommunityReport, string> {
    const report = this.reports.get(id);
    if (!report) return err("Report not found");
    if (report.organizationId !== organizationId)
      return err("Report not found");
    if (report.status !== "open")
      return err("Only open reports can be triaged");

    const now = new Date().toISOString();
    const updated: CommunityReport = {
      ...report,
      status: "triaged",
      updatedAt: now,
      version: report.version + 1,
    };
    this.reports.set(updated.id, updated);
    return ok(updated);
  }

  resolveReport(
    id: CommunityReportId,
    organizationId: OrgId,
    resolvedByUserId: string,
    notes: string | null,
  ): Result<CommunityReport, string> {
    const report = this.reports.get(id);
    if (!report) return err("Report not found");
    if (report.organizationId !== organizationId)
      return err("Report not found");
    if (report.status !== "open" && report.status !== "triaged")
      return err("Only open or triaged reports can be resolved");

    const now = new Date().toISOString();
    const updated: CommunityReport = {
      ...report,
      status: "resolved",
      resolutionNotes: notes,
      resolvedByUserId,
      resolvedAt: now,
      updatedAt: now,
      version: report.version + 1,
    };
    this.reports.set(updated.id, updated);
    return ok(updated);
  }

  dismissReport(
    id: CommunityReportId,
    organizationId: OrgId,
    resolvedByUserId: string,
    notes: string | null,
  ): Result<CommunityReport, string> {
    const report = this.reports.get(id);
    if (!report) return err("Report not found");
    if (report.organizationId !== organizationId)
      return err("Report not found");
    if (report.status !== "open" && report.status !== "triaged")
      return err("Only open or triaged reports can be dismissed");

    const now = new Date().toISOString();
    const updated: CommunityReport = {
      ...report,
      status: "dismissed",
      resolutionNotes: notes,
      resolvedByUserId,
      resolvedAt: now,
      updatedAt: now,
      version: report.version + 1,
    };
    this.reports.set(updated.id, updated);
    return ok(updated);
  }
}
