import { describe, it, expect, beforeEach } from "vitest";
import { ContentService, validateSlug } from "./service";
import type { OrgId, ContentPageId } from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;

describe("ContentService", () => {
  let service: ContentService;

  beforeEach(() => {
    service = new ContentService();
  });

  describe("createPage", () => {
    it("creates a draft page", () => {
      const result = service.createPage({
        title: "About Us",
        slug: "about",
        body: "We are a club.",
        organizationId: ORG1,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("draft");
      expect(result.value.draft.title).toBe("About Us");
      expect(result.value.draft.slug).toBe("about");
      expect(result.value.published).toBeNull();
      expect(result.value.version).toBe(1);
      expect(result.value.organizationId).toBe(ORG1);
    });

    it("rejects empty title", () => {
      const result = service.createPage({
        title: "",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("title");
    });

    it("rejects duplicate slug in same org", () => {
      service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      const result = service.createPage({
        title: "About 2",
        slug: "about",
        body: "body 2",
        organizationId: ORG1,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("slug already exists");
    });

    it("allows same slug in different orgs", () => {
      service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      const result = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG2,
      });
      expect(result.ok).toBe(true);
    });

    it("rejects slug that matches another page's published slug", () => {
      const pageA = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!pageA.ok) throw new Error("create failed");
      service.publish(pageA.value.id, ORG1);
      service.updateDraft(pageA.value.id, ORG1, { slug: "about-v2" });

      const result = service.createPage({
        title: "Conflicting",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("slug already exists");
    });
  });

  describe("slug validation", () => {
    it("accepts valid simple slug", () => {
      expect(validateSlug("about").ok).toBe(true);
    });

    it("accepts valid nested slug", () => {
      expect(validateSlug("about/history").ok).toBe(true);
    });

    it("accepts slug with numbers and hyphens", () => {
      expect(validateSlug("team-2024/roster").ok).toBe(true);
    });

    it("rejects empty slug", () => {
      expect(validateSlug("").ok).toBe(false);
    });

    it("rejects slug with leading slash", () => {
      expect(validateSlug("/about").ok).toBe(false);
    });

    it("rejects slug with trailing slash", () => {
      expect(validateSlug("about/").ok).toBe(false);
    });

    it("rejects slug with empty segments", () => {
      expect(validateSlug("about//history").ok).toBe(false);
    });

    it("rejects slug with uppercase letters", () => {
      expect(validateSlug("About").ok).toBe(false);
    });

    it("rejects slug with special characters", () => {
      expect(validateSlug("about us").ok).toBe(false);
    });

    it("rejects reserved slug 'index'", () => {
      const result = validateSlug("index");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("reserved");
    });
  });

  describe("publish", () => {
    it("copies draft to published snapshot", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "Original body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");

      const pubResult = service.publish(createResult.value.id, ORG1);
      expect(pubResult.ok).toBe(true);
      if (!pubResult.ok) return;
      expect(pubResult.value.status).toBe("published");
      expect(pubResult.value.published).not.toBeNull();
      expect(pubResult.value.published!.title).toBe("About");
      expect(pubResult.value.published!.slug).toBe("about");
      expect(pubResult.value.published!.body).toBe("Original body");
      expect(pubResult.value.version).toBe(2);
    });

    it("post-publish draft edits do not change published snapshot", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "Original body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");
      const id = createResult.value.id;

      service.publish(id, ORG1);

      service.updateDraft(id, ORG1, {
        body: "Updated body after publish",
      });

      const page = service.getPage(id, ORG1);
      if (!page.ok) throw new Error("get failed");
      expect(page.value.draft.body).toBe("Updated body after publish");
      expect(page.value.published!.body).toBe("Original body");
    });

    it("rejects publish when draft slug conflicts with another page's published slug", () => {
      const pageA = service.createPage({
        title: "Page A",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!pageA.ok) throw new Error("create failed");
      service.publish(pageA.value.id, ORG1);
      service.updateDraft(pageA.value.id, ORG1, { slug: "about-v2" });

      const pageB = service.createPage({
        title: "Page B",
        slug: "page-b",
        body: "body",
        organizationId: ORG1,
      });
      if (!pageB.ok) throw new Error("create failed");

      // Simulate legacy/corrupt state that predates slug-collision validation.
      const rawPageB = service.getPage(pageB.value.id, ORG1);
      if (!rawPageB.ok) throw new Error("get failed");
      (service as any).pages.set(pageB.value.id, {
        ...rawPageB.value,
        draft: { ...rawPageB.value.draft, slug: "about" },
      });

      const result = service.publish(pageB.value.id, ORG1);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("slug already exists");
    });
  });

  describe("updateDraft", () => {
    it("updates draft and increments version", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");

      const updateResult = service.updateDraft(
        createResult.value.id,
        ORG1,
        { title: "About Us" },
      );
      expect(updateResult.ok).toBe(true);
      if (!updateResult.ok) return;
      expect(updateResult.value.draft.title).toBe("About Us");
      expect(updateResult.value.version).toBe(2);
    });

    it("rejects empty title", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");

      const result = service.updateDraft(createResult.value.id, ORG1, {
        title: "",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("tenant isolation", () => {
    it("getPage rejects cross-tenant access", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");

      const result = service.getPage(createResult.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("listPages only returns pages for the given org", () => {
      service.createPage({
        title: "Org1 Page",
        slug: "page1",
        body: "body",
        organizationId: ORG1,
      });
      service.createPage({
        title: "Org2 Page",
        slug: "page2",
        body: "body",
        organizationId: ORG2,
      });

      const org1Pages = service.listPages(ORG1);
      expect(org1Pages).toHaveLength(1);
      expect(org1Pages[0].draft.title).toBe("Org1 Page");
    });

    it("updateDraft rejects cross-tenant access", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");

      const result = service.updateDraft(createResult.value.id, ORG2, {
        title: "Hacked",
      });
      expect(result.ok).toBe(false);
    });

    it("publish rejects cross-tenant access", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");

      const result = service.publish(createResult.value.id, ORG2);
      expect(result.ok).toBe(false);
    });

    it("getPublishedBySlug only returns pages for the given org", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");
      service.publish(createResult.value.id, ORG1);

      const result = service.getPublishedBySlug("about", ORG2);
      expect(result.ok).toBe(false);
    });
  });

  describe("block-based content", () => {
    it("creates a page with blocks_v1 format", () => {
      const result = service.createPage({
        title: "Block Page",
        slug: "block-page",
        body: "",
        organizationId: ORG1,
        contentFormat: "blocks_v1",
        blocks: [
          { id: "b1", type: "hero", props: { heading: "Welcome" } },
          { id: "b2", type: "rich_text", props: { content: "Hello" } },
        ],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.draft.contentFormat).toBe("blocks_v1");
      expect(result.value.draft.blocks).toHaveLength(2);
      expect(result.value.draft.blocks![0].type).toBe("hero");
    });

    it("sets blocks_v1 format when blocks are provided even without explicit contentFormat", () => {
      const result = service.createPage({
        title: "Implicit Blocks",
        slug: "implicit-blocks",
        body: "",
        organizationId: ORG1,
        blocks: [{ id: "b1", type: "hero", props: { heading: "Hi" } }],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.draft.contentFormat).toBe("blocks_v1");
    });

    it("instantiates template blocks with fresh IDs", () => {
      service.resolveTemplate = (key: string) => {
        if (key === "test-tpl") {
          return [
            { id: "tpl-1", type: "hero", props: { heading: "Template Hero" } },
            { id: "tpl-2", type: "rich_text", props: { content: "Template text" } },
          ];
        }
        return undefined;
      };

      const result = service.createPage({
        title: "From Template",
        slug: "from-template",
        body: "",
        organizationId: ORG1,
        templateKey: "test-tpl",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.draft.contentFormat).toBe("blocks_v1");
      expect(result.value.draft.blocks).toHaveLength(2);
      // IDs should be regenerated, not the template originals
      expect(result.value.draft.blocks![0].id).not.toBe("tpl-1");
      expect(result.value.draft.blocks![1].id).not.toBe("tpl-2");
      // Props should be preserved
      expect(result.value.draft.blocks![0].props.heading).toBe("Template Hero");
    });

    it("publishes blocks to snapshot via structuredClone", () => {
      const result = service.createPage({
        title: "Pub Blocks",
        slug: "pub-blocks",
        body: "",
        organizationId: ORG1,
        contentFormat: "blocks_v1",
        blocks: [{ id: "b1", type: "hero", props: { heading: "Original" } }],
      });
      if (!result.ok) throw new Error("create failed");

      const pubResult = service.publish(result.value.id, ORG1);
      expect(pubResult.ok).toBe(true);
      if (!pubResult.ok) return;
      expect(pubResult.value.published!.contentFormat).toBe("blocks_v1");
      expect(pubResult.value.published!.blocks).toHaveLength(1);
      expect(pubResult.value.published!.blocks![0].props.heading).toBe("Original");

      // Mutating draft blocks should not affect published
      service.updateDraft(result.value.id, ORG1, {
        blocks: [{ id: "b1", type: "hero", props: { heading: "Changed" } }],
      });
      const page = service.getPage(result.value.id, ORG1);
      if (!page.ok) throw new Error("get failed");
      expect(page.value.published!.blocks![0].props.heading).toBe("Original");
      expect(page.value.draft.blocks![0].props.heading).toBe("Changed");
    });

    it("updates draft blocks", () => {
      const result = service.createPage({
        title: "Editable",
        slug: "editable-blocks",
        body: "",
        organizationId: ORG1,
        contentFormat: "blocks_v1",
        blocks: [{ id: "b1", type: "hero", props: { heading: "V1" } }],
      });
      if (!result.ok) throw new Error("create failed");

      const updated = service.updateDraft(result.value.id, ORG1, {
        blocks: [
          { id: "b1", type: "hero", props: { heading: "V2" } },
          { id: "b2", type: "rich_text", props: { content: "New block" } },
        ],
      });
      expect(updated.ok).toBe(true);
      if (!updated.ok) return;
      expect(updated.value.draft.blocks).toHaveLength(2);
      expect(updated.value.draft.blocks![0].props.heading).toBe("V2");
    });

    it("defaults to legacy_markdown format when no blocks", () => {
      const result = service.createPage({
        title: "Legacy",
        slug: "legacy-page",
        body: "markdown content",
        organizationId: ORG1,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.draft.contentFormat).toBe("legacy_markdown");
      expect(result.value.draft.blocks).toBeUndefined();
    });
  });

  describe("getPublishedBySlug", () => {
    it("returns published page by slug", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");
      service.publish(createResult.value.id, ORG1);

      const result = service.getPublishedBySlug("about", ORG1);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.published!.title).toBe("About");
    });

    it("returns not found for draft-only page", () => {
      service.createPage({
        title: "Draft Only",
        slug: "draft-page",
        body: "body",
        organizationId: ORG1,
      });

      const result = service.getPublishedBySlug("draft-page", ORG1);
      expect(result.ok).toBe(false);
    });

    it("uses published slug, not current draft slug", () => {
      const createResult = service.createPage({
        title: "About",
        slug: "about",
        body: "body",
        organizationId: ORG1,
      });
      if (!createResult.ok) throw new Error("create failed");
      service.publish(createResult.value.id, ORG1);

      // Change draft slug after publish
      service.updateDraft(createResult.value.id, ORG1, {
        slug: "about-us",
      });

      // Old published slug still works
      const result = service.getPublishedBySlug("about", ORG1);
      expect(result.ok).toBe(true);

      // New draft slug does not resolve to published
      const result2 = service.getPublishedBySlug("about-us", ORG1);
      expect(result2.ok).toBe(false);
    });
  });
});
