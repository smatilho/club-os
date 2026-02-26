import type { OrgId, MenuLocation } from "@club-os/domain-core";
import { getTemplate } from "@club-os/ui-kit/src/templates";
import type { ContentService } from "./modules/content/service";
import type { NavigationService } from "./modules/navigation/service";

interface SeedPageSpec {
  templateKey: string;
  slug: string;
  title: string;
  menuLabel: string;
  menuLocation: MenuLocation;
  menuSortOrder: number;
}

const DEFAULT_PAGES: SeedPageSpec[] = [
  {
    templateKey: "home",
    slug: "home",
    title: "Home",
    menuLabel: "Home",
    menuLocation: "public_header",
    menuSortOrder: 0,
  },
  {
    templateKey: "about",
    slug: "about",
    title: "About Us",
    menuLabel: "About",
    menuLocation: "public_header",
    menuSortOrder: 1,
  },
  {
    templateKey: "contact",
    slug: "contact",
    title: "Contact",
    menuLabel: "Contact",
    menuLocation: "public_header",
    menuSortOrder: 2,
  },
];

export interface SeedResult {
  pagesCreated: number;
  pagesSkipped: number;
  menuItemsCreated: number;
  menuItemsSkipped: number;
}

/**
 * Idempotent site seed: creates default CMS pages from templates,
 * publishes them, and creates public_header menu items.
 *
 * Safe to call multiple times — skips pages/menu items that already exist.
 */
export function seedDefaultSite(
  contentService: ContentService,
  navigationService: NavigationService,
  organizationId: OrgId,
): SeedResult {
  const result: SeedResult = {
    pagesCreated: 0,
    pagesSkipped: 0,
    menuItemsCreated: 0,
    menuItemsSkipped: 0,
  };

  for (const spec of DEFAULT_PAGES) {
    // Check if a page with this slug already exists (draft or published)
    const existing = contentService.getPublishedBySlug(spec.slug, organizationId);
    if (existing.ok) {
      result.pagesSkipped++;
      // Ensure menu item exists for this page
      const existingMenuItem = navigationService.findByContentPageId(
        existing.value.id,
        organizationId,
      );
      if (!existingMenuItem) {
        navigationService.upsertForContentPage({
          contentPageId: existing.value.id,
          organizationId,
          location: spec.menuLocation,
          label: spec.menuLabel,
          slug: spec.slug,
        });
        result.menuItemsCreated++;
      } else {
        result.menuItemsSkipped++;
      }
      continue;
    }

    // Also check if draft exists but isn't published yet
    const pages = contentService.listPages(organizationId);
    const draftExists = pages.find((p) => p.draft.slug === spec.slug);
    if (draftExists) {
      result.pagesSkipped++;
      result.menuItemsSkipped++;
      continue;
    }

    // Resolve template blocks
    const template = getTemplate(spec.templateKey);
    const blocks = template?.blocks.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
    }));

    // Create page
    const createResult = contentService.createPage({
      title: spec.title,
      slug: spec.slug,
      body: "",
      organizationId,
      showInMenu: true,
      menuLocation: spec.menuLocation,
      menuLabel: spec.menuLabel,
      menuSortOrder: spec.menuSortOrder,
      contentFormat: blocks ? "blocks_v1" : "legacy_markdown",
      blocks,
    });

    if (!createResult.ok) {
      // Slug collision or validation error — skip
      result.pagesSkipped++;
      result.menuItemsSkipped++;
      continue;
    }

    result.pagesCreated++;

    // Publish immediately
    const publishResult = contentService.publish(
      createResult.value.id,
      organizationId,
    );

    if (!publishResult.ok) {
      continue;
    }

    // Create menu item
    const upsertResult = navigationService.upsertForContentPage({
      contentPageId: createResult.value.id,
      organizationId,
      location: spec.menuLocation,
      label: spec.menuLabel,
      slug: spec.slug,
    });

    if (upsertResult.ok) {
      result.menuItemsCreated++;
    } else {
      result.menuItemsSkipped++;
    }
  }

  return result;
}
