import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { ContentService } from "./service";
import { NavigationService } from "../navigation/service";
import { getTemplate } from "@club-os/ui-kit/src/templates";
import { seedDefaultSite } from "../../seed";
import type { ContentPageId, MenuLocation, OrgId, PageBlock, ContentFormat } from "@club-os/domain-core";

/**
 * Dev default org for public endpoint tenant resolution.
 * In Phase 2, the public endpoint uses this fallback org when no explicit
 * org context is available. Phase 3/5 will introduce proper tenant resolution
 * via subdomain or host header mapping.
 */
const DEV_DEFAULT_ORG_ID = "org-default";

const contentService = new ContentService();
const navigationService = new NavigationService();

interface ContentRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  defaultOrgId?: string;
  navigationService?: NavigationService;
  autoSeed?: boolean;
}

function getContentAuthHandler(
  options?: ContentRoutesOptions,
): MiddlewareHandler {
  if (options?.authHandler) {
    return options.authHandler;
  }
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

function extractContentPageResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const page = contentService.getPageById(id as ContentPageId);
  return {
    id,
    organizationId: page
      ? page.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function errorStatus(error: string): 400 | 404 {
  return error === "Page not found" ? 404 : 400;
}

function validateCreatePageBody(
  body: unknown,
):
  | {
      ok: true;
      value: {
        title: string;
        slug: string;
        body: string;
        showInMenu?: boolean;
        menuLocation?: string;
        menuLabel?: string;
        menuSortOrder?: number;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.title !== "string" || (candidate.title as string).trim() === "") {
    return { ok: false, error: "title must be a non-empty string" };
  }
  if (typeof candidate.slug !== "string") {
    return { ok: false, error: "slug must be a string" };
  }
  if (typeof candidate.body !== "string") {
    return { ok: false, error: "body must be a string" };
  }
  const result: {
    title: string;
    slug: string;
    body: string;
    showInMenu?: boolean;
    menuLocation?: string;
    menuLabel?: string;
    menuSortOrder?: number;
  } = {
    title: candidate.title as string,
    slug: candidate.slug as string,
    body: candidate.body as string,
  };
  if (candidate.showInMenu !== undefined) {
    result.showInMenu = !!candidate.showInMenu;
  }
  if (candidate.menuLocation !== undefined) {
    result.menuLocation = candidate.menuLocation as string;
  }
  if (candidate.menuLabel !== undefined) {
    result.menuLabel = candidate.menuLabel as string;
  }
  if (candidate.menuSortOrder !== undefined) {
    result.menuSortOrder = candidate.menuSortOrder as number;
  }
  if (candidate.contentFormat !== undefined) {
    (result as any).contentFormat = candidate.contentFormat;
  }
  if (candidate.blocks !== undefined) {
    (result as any).blocks = candidate.blocks;
  }
  if (candidate.templateKey !== undefined) {
    (result as any).templateKey = candidate.templateKey;
  }
  return { ok: true, value: result };
}

function validateUpdateDraftBody(
  body: unknown,
):
  | {
      ok: true;
      value: {
        title?: string;
        slug?: string;
        body?: string;
        showInMenu?: boolean;
        menuLocation?: string;
        menuLabel?: string;
        menuSortOrder?: number;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as Record<string, unknown>;
  const result: {
    title?: string;
    slug?: string;
    body?: string;
    showInMenu?: boolean;
    menuLocation?: string;
    menuLabel?: string;
    menuSortOrder?: number;
  } = {};
  if (candidate.title !== undefined) {
    if (typeof candidate.title !== "string") {
      return { ok: false, error: "title must be a string" };
    }
    result.title = candidate.title;
  }
  if (candidate.slug !== undefined) {
    if (typeof candidate.slug !== "string") {
      return { ok: false, error: "slug must be a string" };
    }
    result.slug = candidate.slug;
  }
  if (candidate.body !== undefined) {
    if (typeof candidate.body !== "string") {
      return { ok: false, error: "body must be a string" };
    }
    result.body = candidate.body;
  }
  if (candidate.showInMenu !== undefined) {
    result.showInMenu = !!candidate.showInMenu;
  }
  if (candidate.menuLocation !== undefined) {
    result.menuLocation = candidate.menuLocation as string;
  }
  if (candidate.menuLabel !== undefined) {
    result.menuLabel = candidate.menuLabel as string;
  }
  if (candidate.menuSortOrder !== undefined) {
    result.menuSortOrder = candidate.menuSortOrder as number;
  }
  if (candidate.contentFormat !== undefined) {
    (result as any).contentFormat = candidate.contentFormat;
  }
  if (candidate.blocks !== undefined) {
    (result as any).blocks = candidate.blocks;
  }
  return { ok: true, value: result };
}

function serializeDraft(draft: {
  title: string;
  slug: string;
  body: string;
  updatedAt: string;
  showInMenu?: boolean;
  menuLocation?: string;
  menuLabel?: string;
  menuSortOrder?: number;
  contentFormat?: string;
  blocks?: unknown[];
}) {
  return {
    title: draft.title,
    slug: draft.slug,
    body: draft.body,
    updatedAt: draft.updatedAt,
    showInMenu: draft.showInMenu ?? false,
    menuLocation: draft.menuLocation ?? null,
    menuLabel: draft.menuLabel ?? null,
    menuSortOrder: draft.menuSortOrder ?? null,
    contentFormat: draft.contentFormat ?? "legacy_markdown",
    blocks: draft.blocks ?? [],
  };
}

function serializePublished(published: {
  title: string;
  slug: string;
  body: string;
  publishedAt: string;
  contentFormat?: string;
  blocks?: unknown[];
}) {
  return {
    title: published.title,
    slug: published.slug,
    body: published.body,
    publishedAt: published.publishedAt,
    contentFormat: published.contentFormat ?? "legacy_markdown",
    blocks: published.blocks ?? [],
  };
}

export function contentRoutes(
  app: Hono,
  options?: ContentRoutesOptions,
): void {
  const defaultOrgId = (options?.defaultOrgId ?? DEV_DEFAULT_ORG_ID) as OrgId;
  const navService = options?.navigationService ?? navigationService;

  // Wire up template resolver for block-based pages
  contentService.resolveTemplate = (key: string) => {
    const tpl = getTemplate(key);
    return tpl?.blocks;
  };

  // --- Public routes (no auth) ---
  const publicContent = new Hono();

  publicContent.get("/pages/*", async (c) => {
    // Extract slug from wildcard — supports nested segments like "about/history"
    const slugPath = c.req.path.replace("/api/content/public/pages/", "");
    if (!slugPath || slugPath === "") {
      return c.json({ error: "Slug path is required" }, 400);
    }

    const result = contentService.getPublishedBySlug(slugPath, defaultOrgId);
    if (!result.ok) {
      return c.json({ error: "Page not found" }, 404);
    }

    const page = result.value;
    return c.json({
      data: serializePublished(page.published!),
    });
  });

  app.route("/api/content/public", publicContent);

  // --- Management routes (auth + policy) ---
  const management = new Hono();
  management.use("*", getContentAuthHandler(options));

  // List pages
  management.get(
    "/pages",
    requireCapability("content.read", "content-page"),
    async (c) => {
      const session = c.get("session")!;
      const pages = contentService.listPages(
        session.organizationId as OrgId,
      );
      return c.json({
        data: pages.map((page) => ({
          id: page.id,
          organizationId: page.organizationId,
          status: page.status,
          slug: page.draft.slug,
          title: page.draft.title,
          publishedSlug: page.published?.slug ?? null,
          publishedAt: page.published?.publishedAt ?? null,
          updatedAt: page.updatedAt,
          version: page.version,
          showInMenu: page.draft.showInMenu ?? false,
          menuLocation: page.draft.menuLocation ?? null,
        })),
      });
    },
  );

  // Get page detail
  management.get(
    "/pages/:id",
    requireCapability("content.read", "content-page", {
      extractResource: extractContentPageResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = contentService.getPage(
        c.req.param("id") as ContentPageId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        return c.json({ error: result.error }, 404);
      }
      const page = result.value;
      return c.json({
        data: {
          id: page.id,
          organizationId: page.organizationId,
          status: page.status,
          draft: serializeDraft(page.draft),
          published: page.published
            ? serializePublished(page.published)
            : null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          version: page.version,
        },
      });
    },
  );

  // Create page
  management.post(
    "/pages",
    requireCapability("content.write", "content-page"),
    async (c) => {
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) {
        return c.json({ error: parsedBody.error }, 400);
      }
      const validated = validateCreatePageBody(parsedBody.value);
      if (!validated.ok) {
        return c.json({ error: validated.error }, 400);
      }
      const session = c.get("session")!;

      const v = validated.value as any;
      const result = contentService.createPage({
        title: v.title,
        slug: v.slug,
        body: v.body,
        organizationId: session.organizationId as OrgId,
        showInMenu: v.showInMenu,
        menuLocation: v.menuLocation,
        menuLabel: v.menuLabel,
        menuSortOrder: v.menuSortOrder,
        contentFormat: v.contentFormat,
        blocks: v.blocks,
        templateKey: v.templateKey,
      });
      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }

      const page = result.value;
      return c.json(
        {
          data: {
            id: page.id,
            organizationId: page.organizationId,
            status: page.status,
            draft: serializeDraft(page.draft),
            published: null,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
            version: page.version,
          },
        },
        201,
      );
    },
  );

  // Update draft
  management.patch(
    "/pages/:id",
    requireCapability("content.write", "content-page", {
      extractResource: extractContentPageResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) {
        return c.json({ error: parsedBody.error }, 400);
      }
      const validated = validateUpdateDraftBody(parsedBody.value);
      if (!validated.ok) {
        return c.json({ error: validated.error }, 400);
      }
      const session = c.get("session")!;

      const result = contentService.updateDraft(
        c.req.param("id") as ContentPageId,
        session.organizationId as OrgId,
        validated.value,
      );
      if (!result.ok) {
        return c.json({ error: result.error }, errorStatus(result.error));
      }

      const page = result.value;
      return c.json({
        data: {
          id: page.id,
          organizationId: page.organizationId,
          status: page.status,
          draft: serializeDraft(page.draft),
          published: page.published
            ? serializePublished(page.published)
            : null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          version: page.version,
        },
      });
    },
  );

  // Publish page
  management.post(
    "/pages/:id/publish",
    requireCapability("content.publish", "content-page", {
      extractResource: extractContentPageResource,
    }),
    async (c) => {
      const session = c.get("session")!;

      const result = contentService.publish(
        c.req.param("id") as ContentPageId,
        session.organizationId as OrgId,
      );
      if (!result.ok) {
        return c.json({ error: result.error }, errorStatus(result.error));
      }

      const page = result.value;

      // Menu integration on publish
      let inMenu = false;
      if (page.draft.showInMenu && page.draft.menuLocation) {
        navService.upsertForContentPage({
          contentPageId: page.id,
          organizationId: page.organizationId,
          location: page.draft.menuLocation as MenuLocation,
          label: page.draft.menuLabel || page.draft.title,
          slug: page.published!.slug,
        });
        inMenu = true;
      } else {
        navService.removeForContentPage(page.id, page.organizationId);
      }

      return c.json({
        data: {
          id: page.id,
          organizationId: page.organizationId,
          status: page.status,
          draft: serializeDraft(page.draft),
          published: page.published
            ? serializePublished(page.published)
            : null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          version: page.version,
          inMenu,
        },
      });
    },
  );

  // Seed endpoint — idempotent, creates default pages + menu items
  management.post(
    "/seed",
    requireCapability("content.publish", "content-page"),
    async (c) => {
      const session = c.get("session")!;
      const result = seedDefaultSite(
        contentService,
        navService,
        session.organizationId as OrgId,
      );
      return c.json({ data: result });
    },
  );

  app.route("/api/content", management);

  // Auto-seed when enabled (production/dev startup)
  if (options?.autoSeed !== false) {
    seedDefaultSite(contentService, navService, defaultOrgId);
  }
}

// Export service for testing
export { contentService, navigationService, ContentService };
