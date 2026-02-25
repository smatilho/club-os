import { describe, it, expect, beforeEach } from "vitest";
import { CommunityService } from "./service";
import type {
  OrgId,
  CommunityPostId,
  CommunityCommentId,
  CommunityReportId,
} from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;

describe("CommunityService", () => {
  let service: CommunityService;

  beforeEach(() => {
    service = new CommunityService();
  });

  // --- Posts ---

  describe("createPost", () => {
    it("creates a visible post", () => {
      const result = service.createPost({
        authorUserId: "user-1",
        organizationId: ORG1,
        title: "Hello World",
        body: "First post!",
        tags: ["General", "intro"],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("visible");
      expect(result.value.title).toBe("Hello World");
      expect(result.value.tags).toEqual(["general", "intro"]);
      expect(result.value.commentCount).toBe(0);
      expect(result.value.version).toBe(1);
    });

    it("rejects empty title", () => {
      const result = service.createPost({
        authorUserId: "user-1",
        organizationId: ORG1,
        title: "",
        body: "body",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects empty body", () => {
      const result = service.createPost({
        authorUserId: "user-1",
        organizationId: ORG1,
        title: "Title",
        body: "",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("listPosts", () => {
    it("returns posts for org filtered by tenant", () => {
      service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "First",
        body: "b",
      });
      service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Second",
        body: "b",
      });
      service.createPost({
        authorUserId: "u1",
        organizationId: ORG2,
        title: "Other Org",
        body: "b",
      });

      const posts = service.listPosts(ORG1);
      expect(posts).toHaveLength(2);
      const titles = posts.map((p) => p.title);
      expect(titles).toContain("First");
      expect(titles).toContain("Second");
    });
  });

  describe("updatePost", () => {
    it("author can update own post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Original",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      const result = service.updatePost(
        created.value.id,
        ORG1,
        "u1",
        false,
        { title: "Updated" },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.title).toBe("Updated");
      expect(result.value.version).toBe(2);
    });

    it("non-author non-moderator cannot update", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      const result = service.updatePost(
        created.value.id,
        ORG1,
        "u2",
        false,
        { title: "Hacked" },
      );
      expect(result.ok).toBe(false);
    });

    it("moderator can update any post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      const result = service.updatePost(
        created.value.id,
        ORG1,
        "mod-user",
        true,
        { title: "Moderated" },
      );
      expect(result.ok).toBe(true);
    });
  });

  // --- Post moderation ---

  describe("hidePost / unhidePost", () => {
    it("hides a visible post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      const result = service.hidePost(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("hidden");
    });

    it("unhides a hidden post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      service.hidePost(created.value.id, ORG1);
      const result = service.unhidePost(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("visible");
    });

    it("cannot unhide a non-hidden post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      const result = service.unhidePost(created.value.id, ORG1);
      expect(result.ok).toBe(false);
    });
  });

  describe("lockPost / unlockPost", () => {
    it("locks a visible post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      const result = service.lockPost(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("locked");
    });

    it("unlocks a locked post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      service.lockPost(created.value.id, ORG1);
      const result = service.unlockPost(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("visible");
    });

    it("prevents new comments on locked post", () => {
      const created = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!created.ok) throw new Error("fail");

      service.lockPost(created.value.id, ORG1);

      const commentResult = service.createComment({
        postId: created.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "Cannot add this",
      });
      expect(commentResult.ok).toBe(false);
      if (commentResult.ok) return;
      expect(commentResult.error).toContain("locked");
    });
  });

  // --- Comments ---

  describe("createComment", () => {
    it("creates a comment on visible post", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "Great post!",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.body).toBe("Great post!");
      expect(result.value.status).toBe("visible");

      // Comment count incremented
      const updated = service.getPost(post.value.id, ORG1);
      expect(updated.ok).toBe(true);
      if (!updated.ok) return;
      expect(updated.value.commentCount).toBe(1);
    });

    it("rejects empty body", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects comment on hidden post", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");
      service.hidePost(post.value.id, ORG1);

      const result = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "Comment",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("hidden");
    });

    it("rejects comment on cross-org post", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG2,
        body: "Comment",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("hideComment / unhideComment", () => {
    it("hides and unhides a comment", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const comment = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "Comment",
      });
      if (!comment.ok) throw new Error("fail");

      const hideResult = service.hideComment(comment.value.id, ORG1);
      expect(hideResult.ok).toBe(true);
      if (hideResult.ok) expect(hideResult.value.status).toBe("hidden");

      const unhideResult = service.unhideComment(comment.value.id, ORG1);
      expect(unhideResult.ok).toBe(true);
      if (unhideResult.ok) expect(unhideResult.value.status).toBe("visible");
    });
  });

  // --- Reports ---

  describe("createReport", () => {
    it("creates a report for a post", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.createReport({
        organizationId: ORG1,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u2",
        reasonCode: "spam",
        details: "This is spam",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("open");
      expect(result.value.reasonCode).toBe("spam");
    });

    it("creates a report for a comment", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const comment = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "Bad comment",
      });
      if (!comment.ok) throw new Error("fail");

      const result = service.createReport({
        organizationId: ORG1,
        targetType: "comment",
        targetId: comment.value.id,
        reportedByUserId: "u1",
        reasonCode: "harassment",
      });
      expect(result.ok).toBe(true);
    });

    it("rejects invalid reasonCode", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.createReport({
        organizationId: ORG1,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u2",
        reasonCode: "invalid-code",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects report for cross-org target", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.createReport({
        organizationId: ORG2,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u3",
        reasonCode: "spam",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("report workflow: triage → resolve/dismiss", () => {
    function createPostAndReport() {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const report = service.createReport({
        organizationId: ORG1,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u2",
        reasonCode: "abuse",
      });
      if (!report.ok) throw new Error("fail");
      return report.value;
    }

    it("triages an open report", () => {
      const report = createPostAndReport();
      const result = service.triageReport(report.id, ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("triaged");
    });

    it("resolves a triaged report", () => {
      const report = createPostAndReport();
      service.triageReport(report.id, ORG1);
      const result = service.resolveReport(
        report.id,
        ORG1,
        "mod-1",
        "Took action",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("resolved");
      expect(result.value.resolvedByUserId).toBe("mod-1");
      expect(result.value.resolutionNotes).toBe("Took action");
      expect(result.value.resolvedAt).toBeTruthy();
    });

    it("resolves an open report directly", () => {
      const report = createPostAndReport();
      const result = service.resolveReport(
        report.id,
        ORG1,
        "mod-1",
        null,
      );
      expect(result.ok).toBe(true);
    });

    it("dismisses an open report", () => {
      const report = createPostAndReport();
      const result = service.dismissReport(
        report.id,
        ORG1,
        "mod-1",
        "Not actionable",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("dismissed");
    });

    it("cannot triage a resolved report", () => {
      const report = createPostAndReport();
      service.resolveReport(report.id, ORG1, "mod-1", null);
      const result = service.triageReport(report.id, ORG1);
      expect(result.ok).toBe(false);
    });

    it("cannot resolve an already resolved report", () => {
      const report = createPostAndReport();
      service.resolveReport(report.id, ORG1, "mod-1", null);
      const result = service.resolveReport(
        report.id,
        ORG1,
        "mod-2",
        null,
      );
      expect(result.ok).toBe(false);
    });
  });

  // --- Tenant isolation ---

  describe("tenant isolation", () => {
    it("getPost denies cross-org access", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.getPost(post.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("getComment denies cross-org access", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const comment = service.createComment({
        postId: post.value.id,
        authorUserId: "u2",
        organizationId: ORG1,
        body: "Comment",
      });
      if (!comment.ok) throw new Error("fail");

      const result = service.getComment(comment.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("getReport denies cross-org access", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const report = service.createReport({
        organizationId: ORG1,
        targetType: "post",
        targetId: post.value.id,
        reportedByUserId: "u2",
        reasonCode: "spam",
      });
      if (!report.ok) throw new Error("fail");

      const result = service.getReport(report.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("hidePost denies cross-org moderation", () => {
      const post = service.createPost({
        authorUserId: "u1",
        organizationId: ORG1,
        title: "Post",
        body: "body",
      });
      if (!post.ok) throw new Error("fail");

      const result = service.hidePost(post.value.id, ORG2);
      expect(result.ok).toBe(false);
    });
  });
});
