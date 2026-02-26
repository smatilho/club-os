import { describe, it, expect, beforeEach } from "vitest";
import { NavigationService } from "./service";
import type { OrgId, MenuItemId, ContentPageId } from "@club-os/domain-core";

const ORG1 = "org-1" as OrgId;
const ORG2 = "org-2" as OrgId;

describe("NavigationService", () => {
  let service: NavigationService;

  beforeEach(() => {
    service = new NavigationService();
  });

  describe("createItem", () => {
    it("creates a menu item with defaults", () => {
      const result = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/public/about",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.label).toBe("About");
      expect(result.value.location).toBe("public_header");
      expect(result.value.parentId).toBeNull();
      expect(result.value.visibility).toBe("always");
      expect(result.value.sortOrder).toBe(0);
      expect(result.value.contentPageId).toBeNull();
    });

    it("auto-increments sortOrder", () => {
      service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "First",
        linkType: "internal_path",
        linkTarget: "/first",
      });
      const result = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Second",
        linkType: "internal_path",
        linkTarget: "/second",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.sortOrder).toBe(1);
    });

    it("rejects empty label", () => {
      const result = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("label");
    });

    it("rejects invalid location", () => {
      const result = service.createItem({
        organizationId: ORG1,
        location: "invalid" as any,
        label: "Test",
        linkType: "internal_path",
        linkTarget: "/test",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects empty linkTarget", () => {
      const result = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Test",
        linkType: "internal_path",
        linkTarget: "",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("nesting", () => {
    it("allows one level of nesting", () => {
      const parent = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Parent",
        linkType: "internal_path",
        linkTarget: "/parent",
      });
      if (!parent.ok) throw new Error("create failed");

      const child = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Child",
        linkType: "internal_path",
        linkTarget: "/child",
        parentId: parent.value.id,
      });
      expect(child.ok).toBe(true);
      if (!child.ok) return;
      expect(child.value.parentId).toBe(parent.value.id);
    });

    it("rejects two levels of nesting", () => {
      const parent = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Parent",
        linkType: "internal_path",
        linkTarget: "/parent",
      });
      if (!parent.ok) throw new Error("create failed");

      const child = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Child",
        linkType: "internal_path",
        linkTarget: "/child",
        parentId: parent.value.id,
      });
      if (!child.ok) throw new Error("create child failed");

      const grandchild = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Grandchild",
        linkType: "internal_path",
        linkTarget: "/grandchild",
        parentId: child.value.id,
      });
      expect(grandchild.ok).toBe(false);
      if (grandchild.ok) return;
      expect(grandchild.error).toContain("nesting depth");
    });

    it("rejects parent in different location", () => {
      const parent = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Parent",
        linkType: "internal_path",
        linkTarget: "/parent",
      });
      if (!parent.ok) throw new Error("create failed");

      const child = service.createItem({
        organizationId: ORG1,
        location: "public_footer",
        label: "Child",
        linkType: "internal_path",
        linkTarget: "/child",
        parentId: parent.value.id,
      });
      expect(child.ok).toBe(false);
    });
  });

  describe("updateItem", () => {
    it("updates label", () => {
      const created = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      if (!created.ok) throw new Error("create failed");

      const result = service.updateItem(created.value.id, ORG1, {
        label: "About Us",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.label).toBe("About Us");
    });

    it("rejects empty label", () => {
      const created = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      if (!created.ok) throw new Error("create failed");

      const result = service.updateItem(created.value.id, ORG1, { label: "" });
      expect(result.ok).toBe(false);
    });

    it("rejects self-parent", () => {
      const created = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      if (!created.ok) throw new Error("create failed");

      const result = service.updateItem(created.value.id, ORG1, {
        parentId: created.value.id,
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("deleteItem", () => {
    it("deletes item", () => {
      const created = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      if (!created.ok) throw new Error("create failed");

      const result = service.deleteItem(created.value.id, ORG1);
      expect(result.ok).toBe(true);
      expect(service.listAll(ORG1)).toHaveLength(0);
    });

    it("cascades to children", () => {
      const parent = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Parent",
        linkType: "internal_path",
        linkTarget: "/parent",
      });
      if (!parent.ok) throw new Error("create failed");

      service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Child",
        linkType: "internal_path",
        linkTarget: "/child",
        parentId: parent.value.id,
      });

      service.deleteItem(parent.value.id, ORG1);
      expect(service.listAll(ORG1)).toHaveLength(0);
    });

    it("rejects cross-tenant delete", () => {
      const created = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      if (!created.ok) throw new Error("create failed");

      const result = service.deleteItem(created.value.id, ORG2);
      expect(result.ok).toBe(false);
    });
  });

  describe("tenant isolation", () => {
    it("listByLocation only returns items for the given org", () => {
      service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Org1",
        linkType: "internal_path",
        linkTarget: "/org1",
      });
      service.createItem({
        organizationId: ORG2,
        location: "public_header",
        label: "Org2",
        linkType: "internal_path",
        linkTarget: "/org2",
      });

      const org1Items = service.listByLocation(ORG1, "public_header");
      expect(org1Items).toHaveLength(1);
      expect(org1Items[0].label).toBe("Org1");
    });

    it("updateItem rejects cross-tenant access", () => {
      const created = service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        linkType: "internal_path",
        linkTarget: "/about",
      });
      if (!created.ok) throw new Error("create failed");

      const result = service.updateItem(created.value.id, ORG2, {
        label: "Hacked",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("upsertForContentPage", () => {
    it("creates menu item for content page", () => {
      const result = service.upsertForContentPage({
        contentPageId: "page-1" as ContentPageId,
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        slug: "about",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.contentPageId).toBe("page-1");
      expect(result.value.linkTarget).toBe("/public/about");
      expect(result.value.linkType).toBe("internal_page");
    });

    it("updates existing menu item on second call (idempotent)", () => {
      service.upsertForContentPage({
        contentPageId: "page-1" as ContentPageId,
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        slug: "about",
      });

      const result = service.upsertForContentPage({
        contentPageId: "page-1" as ContentPageId,
        organizationId: ORG1,
        location: "public_header",
        label: "About Us",
        slug: "about-us",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.label).toBe("About Us");
      expect(result.value.linkTarget).toBe("/public/about-us");

      // Should still be only one item
      expect(service.listAll(ORG1)).toHaveLength(1);
    });

    it("removeForContentPage removes linked item", () => {
      service.upsertForContentPage({
        contentPageId: "page-1" as ContentPageId,
        organizationId: ORG1,
        location: "public_header",
        label: "About",
        slug: "about",
      });

      const result = service.removeForContentPage("page-1" as ContentPageId, ORG1);
      expect(result.ok).toBe(true);
      expect(service.listAll(ORG1)).toHaveLength(0);
    });

    it("removeForContentPage is no-op when no linked item", () => {
      const result = service.removeForContentPage("page-99" as ContentPageId, ORG1);
      expect(result.ok).toBe(true);
    });
  });

  describe("listByLocation sort order", () => {
    it("returns items sorted by sortOrder", () => {
      service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Third",
        linkType: "internal_path",
        linkTarget: "/third",
        sortOrder: 2,
      });
      service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "First",
        linkType: "internal_path",
        linkTarget: "/first",
        sortOrder: 0,
      });
      service.createItem({
        organizationId: ORG1,
        location: "public_header",
        label: "Second",
        linkType: "internal_path",
        linkTarget: "/second",
        sortOrder: 1,
      });

      const items = service.listByLocation(ORG1, "public_header");
      expect(items.map((i) => i.label)).toEqual(["First", "Second", "Third"]);
    });
  });
});
