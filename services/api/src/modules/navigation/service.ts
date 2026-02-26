import type {
  ContentPageId,
  MenuItem,
  MenuItemId,
  MenuLocation,
  MenuItemVisibility,
  MenuItemLinkType,
  OrgId,
} from "@club-os/domain-core";
import { menuItemId, ok, err, type Result } from "@club-os/domain-core";

const VALID_LOCATIONS: MenuLocation[] = [
  "public_header",
  "public_footer",
  "member_primary",
  "admin_primary",
];

const MAX_NESTING_DEPTH = 1;

export class NavigationService {
  private items = new Map<string, MenuItem>();

  reset(): void {
    this.items.clear();
  }

  getItemById(id: MenuItemId): MenuItem | undefined {
    return this.items.get(id);
  }

  createItem(input: {
    organizationId: OrgId;
    location: MenuLocation;
    label: string;
    linkType: MenuItemLinkType;
    linkTarget: string;
    parentId?: MenuItemId | null;
    sortOrder?: number;
    visibility?: MenuItemVisibility;
    contentPageId?: ContentPageId | null;
  }): Result<MenuItem, string> {
    if (!input.label || input.label.trim() === "") {
      return err("label is required");
    }
    if (!VALID_LOCATIONS.includes(input.location)) {
      return err(`Invalid location: ${input.location}`);
    }
    if (!input.linkTarget || input.linkTarget.trim() === "") {
      return err("linkTarget is required");
    }

    const parentId = input.parentId ?? null;
    if (parentId) {
      const parent = this.items.get(parentId);
      if (!parent) {
        return err("Parent menu item not found");
      }
      if (parent.organizationId !== input.organizationId) {
        return err("Parent menu item not found");
      }
      if (parent.location !== input.location) {
        return err("Parent must be in the same menu location");
      }
      if (parent.parentId !== null) {
        return err(
          `Maximum nesting depth is ${MAX_NESTING_DEPTH}`,
        );
      }
    }

    const now = new Date().toISOString();
    const item: MenuItem = {
      id: menuItemId(crypto.randomUUID()),
      organizationId: input.organizationId,
      location: input.location,
      label: input.label,
      linkType: input.linkType,
      linkTarget: input.linkTarget,
      parentId,
      sortOrder: input.sortOrder ?? this.nextSortOrder(input.organizationId, input.location, parentId),
      visibility: input.visibility ?? "always",
      contentPageId: input.contentPageId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);
    return ok(item);
  }

  updateItem(
    id: MenuItemId,
    organizationId: OrgId,
    input: {
      label?: string;
      linkTarget?: string;
      linkType?: MenuItemLinkType;
      sortOrder?: number;
      visibility?: MenuItemVisibility;
      parentId?: MenuItemId | null;
    },
  ): Result<MenuItem, string> {
    const item = this.items.get(id);
    if (!item) return err("Menu item not found");
    if (item.organizationId !== organizationId) return err("Menu item not found");

    if (input.label !== undefined && input.label.trim() === "") {
      return err("label must not be empty");
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      const parent = this.items.get(input.parentId);
      if (!parent || parent.organizationId !== organizationId) {
        return err("Parent menu item not found");
      }
      if (parent.location !== item.location) {
        return err("Parent must be in the same menu location");
      }
      if (parent.parentId !== null) {
        return err(`Maximum nesting depth is ${MAX_NESTING_DEPTH}`);
      }
      if (input.parentId === id) {
        return err("Item cannot be its own parent");
      }
    }

    const now = new Date().toISOString();
    const updated: MenuItem = {
      ...item,
      label: input.label ?? item.label,
      linkTarget: input.linkTarget ?? item.linkTarget,
      linkType: input.linkType ?? item.linkType,
      sortOrder: input.sortOrder ?? item.sortOrder,
      visibility: input.visibility ?? item.visibility,
      parentId: input.parentId !== undefined ? input.parentId : item.parentId,
      updatedAt: now,
    };

    this.items.set(updated.id, updated);
    return ok(updated);
  }

  deleteItem(id: MenuItemId, organizationId: OrgId): Result<void, string> {
    const item = this.items.get(id);
    if (!item) return err("Menu item not found");
    if (item.organizationId !== organizationId) return err("Menu item not found");

    // Cascade delete children
    for (const [childId, child] of this.items) {
      if (child.parentId === id && child.organizationId === organizationId) {
        this.items.delete(childId);
      }
    }

    this.items.delete(id);
    return ok(undefined);
  }

  listByLocation(
    organizationId: OrgId,
    location: MenuLocation,
  ): MenuItem[] {
    return [...this.items.values()]
      .filter(
        (item) =>
          item.organizationId === organizationId &&
          item.location === location,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  listAll(organizationId: OrgId): MenuItem[] {
    return [...this.items.values()]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => {
        if (a.location !== b.location) return a.location.localeCompare(b.location);
        return a.sortOrder - b.sortOrder;
      });
  }

  findByContentPageId(
    contentPageId: ContentPageId,
    organizationId: OrgId,
  ): MenuItem | undefined {
    return [...this.items.values()].find(
      (item) =>
        item.contentPageId === contentPageId &&
        item.organizationId === organizationId,
    );
  }

  upsertForContentPage(input: {
    contentPageId: ContentPageId;
    organizationId: OrgId;
    location: MenuLocation;
    label: string;
    slug: string;
  }): Result<MenuItem, string> {
    const existing = this.findByContentPageId(
      input.contentPageId,
      input.organizationId,
    );

    if (existing) {
      return this.updateItem(existing.id, input.organizationId, {
        label: input.label,
        linkTarget: `/public/${input.slug}`,
      });
    }

    return this.createItem({
      organizationId: input.organizationId,
      location: input.location,
      label: input.label,
      linkType: "internal_page",
      linkTarget: `/public/${input.slug}`,
      contentPageId: input.contentPageId,
    });
  }

  removeForContentPage(
    contentPageId: ContentPageId,
    organizationId: OrgId,
  ): Result<void, string> {
    const existing = this.findByContentPageId(contentPageId, organizationId);
    if (!existing) return ok(undefined);
    return this.deleteItem(existing.id, organizationId);
  }

  private nextSortOrder(
    organizationId: OrgId,
    location: MenuLocation,
    parentId: MenuItemId | null,
  ): number {
    const siblings = [...this.items.values()].filter(
      (item) =>
        item.organizationId === organizationId &&
        item.location === location &&
        item.parentId === parentId,
    );
    if (siblings.length === 0) return 0;
    return Math.max(...siblings.map((s) => s.sortOrder)) + 1;
  }
}
