import { describe, it, expect, beforeEach } from "vitest";
import { ContentService } from "./modules/content/service";
import { NavigationService } from "./modules/navigation/service";
import { seedDefaultSite } from "./seed";
import type { OrgId } from "@club-os/domain-core";
import { getTemplate } from "@club-os/ui-kit/src/templates";

const ORG_ID = "org-seed-test" as OrgId;

describe("seedDefaultSite", () => {
  let contentService: ContentService;
  let navigationService: NavigationService;

  beforeEach(() => {
    contentService = new ContentService();
    navigationService = new NavigationService();
    // Wire up template resolver
    contentService.resolveTemplate = (key: string) => {
      const tpl = getTemplate(key);
      return tpl?.blocks;
    };
  });

  it("creates Home, About, and Contact pages on first run", () => {
    const result = seedDefaultSite(contentService, navigationService, ORG_ID);

    expect(result.pagesCreated).toBe(3);
    expect(result.pagesSkipped).toBe(0);
    expect(result.menuItemsCreated).toBe(3);
    expect(result.menuItemsSkipped).toBe(0);
  });

  it("seeded pages are published", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);

    const pages = contentService.listPages(ORG_ID);
    expect(pages).toHaveLength(3);
    for (const page of pages) {
      expect(page.status).toBe("published");
      expect(page.published).not.toBeNull();
    }
  });

  it("seeded pages use blocks_v1 content format", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);

    const pages = contentService.listPages(ORG_ID);
    for (const page of pages) {
      expect(page.draft.contentFormat).toBe("blocks_v1");
      expect(page.draft.blocks).toBeDefined();
      expect(page.draft.blocks!.length).toBeGreaterThan(0);
    }
  });

  it("creates menu items in public_header location", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);

    const menuItems = navigationService.listByLocation(ORG_ID, "public_header");
    expect(menuItems).toHaveLength(3);
    expect(menuItems.map((i) => i.label)).toEqual(["Home", "About", "Contact"]);
  });

  it("menu items link to correct public URLs", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);

    const menuItems = navigationService.listByLocation(ORG_ID, "public_header");
    expect(menuItems[0]!.linkTarget).toBe("/public/home");
    expect(menuItems[1]!.linkTarget).toBe("/public/about");
    expect(menuItems[2]!.linkTarget).toBe("/public/contact");
  });

  it("is idempotent — second run skips all pages and menu items", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);
    const result = seedDefaultSite(contentService, navigationService, ORG_ID);

    expect(result.pagesCreated).toBe(0);
    expect(result.pagesSkipped).toBe(3);
    expect(result.menuItemsCreated).toBe(0);
    expect(result.menuItemsSkipped).toBe(3);

    // Still only 3 pages and 3 menu items
    expect(contentService.listPages(ORG_ID)).toHaveLength(3);
    expect(navigationService.listByLocation(ORG_ID, "public_header")).toHaveLength(3);
  });

  it("is tenant-isolated — does not affect other orgs", () => {
    const otherOrg = "org-other" as OrgId;
    seedDefaultSite(contentService, navigationService, ORG_ID);
    seedDefaultSite(contentService, navigationService, otherOrg);

    expect(contentService.listPages(ORG_ID)).toHaveLength(3);
    expect(contentService.listPages(otherOrg)).toHaveLength(3);
    expect(navigationService.listByLocation(ORG_ID, "public_header")).toHaveLength(3);
    expect(navigationService.listByLocation(otherOrg, "public_header")).toHaveLength(3);
  });

  it("homepage is resolvable by slug after seed", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);

    const homeResult = contentService.getPublishedBySlug("home", ORG_ID);
    expect(homeResult.ok).toBe(true);
    if (homeResult.ok) {
      expect(homeResult.value.published!.title).toBe("Home");
    }
  });

  it("recreates missing menu items if pages already exist", () => {
    seedDefaultSite(contentService, navigationService, ORG_ID);

    // Delete all menu items
    const items = navigationService.listByLocation(ORG_ID, "public_header");
    for (const item of items) {
      navigationService.deleteItem(item.id, ORG_ID);
    }
    expect(navigationService.listByLocation(ORG_ID, "public_header")).toHaveLength(0);

    // Re-seed should recreate menu items
    const result = seedDefaultSite(contentService, navigationService, ORG_ID);
    expect(result.pagesSkipped).toBe(3);
    expect(result.menuItemsCreated).toBe(3);
    expect(navigationService.listByLocation(ORG_ID, "public_header")).toHaveLength(3);
  });
});
