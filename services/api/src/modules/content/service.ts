import type {
  ContentPage,
  ContentPageId,
  ContentFormat,
  PageBlock,
  OrgId,
} from "@club-os/domain-core";
import { contentPageId, ok, err, type Result } from "@club-os/domain-core";

const SLUG_SEGMENT_RE = /^[a-z0-9-]+$/;
const RESERVED_SLUGS = new Set(["index"]);

export function validateSlug(
  slug: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof slug !== "string" || slug === "") {
    return { ok: false, error: "slug is required" };
  }
  if (slug.startsWith("/")) {
    return { ok: false, error: "slug must not start with /" };
  }
  if (slug.endsWith("/")) {
    return { ok: false, error: "slug must not end with /" };
  }
  const segments = slug.split("/");
  for (const segment of segments) {
    if (segment === "") {
      return { ok: false, error: "slug must not contain empty segments" };
    }
    if (!SLUG_SEGMENT_RE.test(segment)) {
      return {
        ok: false,
        error: `slug segment "${segment}" contains invalid characters (allowed: a-z 0-9 -)`,
      };
    }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: `slug "${slug}" is reserved` };
  }
  return { ok: true, value: slug };
}

export class ContentService {
  private pages = new Map<string, ContentPage>();
  resolveTemplate?: (key: string) => PageBlock[] | undefined;

  private findSlugConflict(
    slug: string,
    organizationId: OrgId,
    excludeId?: ContentPageId,
  ): ContentPage | undefined {
    return [...this.pages.values()].find((page) => {
      if (page.organizationId !== organizationId) return false;
      if (excludeId && page.id === excludeId) return false;
      return page.draft.slug === slug || page.published?.slug === slug;
    });
  }

  reset(): void {
    this.pages.clear();
  }

  getPageById(id: ContentPageId): ContentPage | undefined {
    return this.pages.get(id);
  }

  createPage(input: {
    title: string;
    slug: string;
    body: string;
    organizationId: OrgId;
    showInMenu?: boolean;
    menuLocation?: string;
    menuLabel?: string;
    menuSortOrder?: number;
    contentFormat?: ContentFormat;
    blocks?: PageBlock[];
    templateKey?: string;
  }): Result<ContentPage, string> {
    const slugResult = validateSlug(input.slug);
    if (!slugResult.ok) {
      return err(slugResult.error);
    }

    if (!input.title || input.title.trim() === "") {
      return err("title is required");
    }

    // Enforce slug uniqueness across both draft and published slugs in an org.
    const duplicate = this.findSlugConflict(input.slug, input.organizationId);
    if (duplicate) {
      return err("A page with this slug already exists in this organization");
    }

    // Determine content format and blocks
    let contentFormat: ContentFormat = input.contentFormat ?? "legacy_markdown";
    let blocks: PageBlock[] | undefined = input.blocks;

    // Template instantiation: regenerate block IDs
    if (input.templateKey && !blocks) {
      const templateBlocks = this.resolveTemplate?.(input.templateKey);
      if (templateBlocks) {
        blocks = templateBlocks.map((b) => ({
          ...b,
          id: crypto.randomUUID(),
        }));
        contentFormat = "blocks_v1";
      }
    }

    if (blocks && blocks.length > 0) {
      contentFormat = "blocks_v1";
    }

    const now = new Date().toISOString();
    const page: ContentPage = {
      id: contentPageId(crypto.randomUUID()),
      organizationId: input.organizationId,
      status: "draft",
      draft: {
        title: input.title,
        slug: input.slug,
        body: input.body,
        updatedAt: now,
        showInMenu: input.showInMenu,
        menuLocation: input.menuLocation,
        menuLabel: input.menuLabel,
        menuSortOrder: input.menuSortOrder,
        contentFormat,
        blocks,
      },
      published: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.pages.set(page.id, page);
    return ok(page);
  }

  getPage(
    id: ContentPageId,
    organizationId: OrgId,
  ): Result<ContentPage, string> {
    const page = this.pages.get(id);
    if (!page) {
      return err("Page not found");
    }
    if (page.organizationId !== organizationId) {
      return err("Page not found");
    }
    return ok(page);
  }

  listPages(organizationId: OrgId): ContentPage[] {
    return [...this.pages.values()].filter(
      (p) => p.organizationId === organizationId,
    );
  }

  updateDraft(
    id: ContentPageId,
    organizationId: OrgId,
    input: {
      title?: string;
      slug?: string;
      body?: string;
      showInMenu?: boolean;
      menuLocation?: string;
      menuLabel?: string;
      menuSortOrder?: number;
      contentFormat?: ContentFormat;
      blocks?: PageBlock[];
    },
  ): Result<ContentPage, string> {
    const page = this.pages.get(id);
    if (!page) {
      return err("Page not found");
    }
    if (page.organizationId !== organizationId) {
      return err("Page not found");
    }

    const newSlug = input.slug ?? page.draft.slug;
    if (input.slug !== undefined) {
      const slugResult = validateSlug(input.slug);
      if (!slugResult.ok) {
        return err(slugResult.error);
      }
      const duplicate = this.findSlugConflict(input.slug, organizationId, id);
      if (duplicate) {
        return err(
          "A page with this slug already exists in this organization",
        );
      }
    }

    if (input.title !== undefined && input.title.trim() === "") {
      return err("title must not be empty");
    }

    const now = new Date().toISOString();
    const updated: ContentPage = {
      ...page,
      draft: {
        title: input.title ?? page.draft.title,
        slug: newSlug,
        body: input.body ?? page.draft.body,
        updatedAt: now,
        showInMenu: input.showInMenu !== undefined ? input.showInMenu : page.draft.showInMenu,
        menuLocation: input.menuLocation !== undefined ? input.menuLocation : page.draft.menuLocation,
        menuLabel: input.menuLabel !== undefined ? input.menuLabel : page.draft.menuLabel,
        menuSortOrder: input.menuSortOrder !== undefined ? input.menuSortOrder : page.draft.menuSortOrder,
        contentFormat: input.contentFormat ?? page.draft.contentFormat,
        blocks: input.blocks !== undefined ? input.blocks : page.draft.blocks,
      },
      updatedAt: now,
      version: page.version + 1,
    };

    this.pages.set(updated.id, updated);
    return ok(updated);
  }

  publish(
    id: ContentPageId,
    organizationId: OrgId,
  ): Result<ContentPage, string> {
    const page = this.pages.get(id);
    if (!page) {
      return err("Page not found");
    }
    if (page.organizationId !== organizationId) {
      return err("Page not found");
    }

    const duplicate = this.findSlugConflict(page.draft.slug, organizationId, id);
    if (duplicate) {
      return err("A page with this slug already exists in this organization");
    }

    const now = new Date().toISOString();
    const updated: ContentPage = {
      ...page,
      status: "published",
      published: {
        title: page.draft.title,
        slug: page.draft.slug,
        body: page.draft.body,
        publishedAt: now,
        contentFormat: page.draft.contentFormat,
        blocks: page.draft.blocks ? structuredClone(page.draft.blocks) : undefined,
      },
      updatedAt: now,
      version: page.version + 1,
    };

    this.pages.set(updated.id, updated);
    return ok(updated);
  }

  getPublishedBySlug(
    slug: string,
    organizationId: OrgId,
  ): Result<ContentPage, string> {
    const page = [...this.pages.values()].find(
      (p) =>
        p.organizationId === organizationId &&
        p.published !== null &&
        p.published.slug === slug,
    );
    if (!page) {
      return err("Page not found");
    }
    return ok(page);
  }
}
