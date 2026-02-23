import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { ContentService } from "./service";
import type { ContentPageId, OrgId } from "@club-os/domain-core";

/**
 * Dev default org for public endpoint tenant resolution.
 * In Phase 2, the public endpoint uses this fallback org when no explicit
 * org context is available. Phase 3/5 will introduce proper tenant resolution
 * via subdomain or host header mapping.
 */
const DEV_DEFAULT_ORG_ID = "org-default";

const contentService = new ContentService();

interface ContentRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  defaultOrgId?: string;
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
  | { ok: true; value: { title: string; slug: string; body: string } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as {
    title?: unknown;
    slug?: unknown;
    body?: unknown;
  };
  if (typeof candidate.title !== "string" || candidate.title.trim() === "") {
    return { ok: false, error: "title must be a non-empty string" };
  }
  if (typeof candidate.slug !== "string") {
    return { ok: false, error: "slug must be a string" };
  }
  if (typeof candidate.body !== "string") {
    return { ok: false, error: "body must be a string" };
  }
  return {
    ok: true,
    value: {
      title: candidate.title,
      slug: candidate.slug,
      body: candidate.body,
    },
  };
}

function validateUpdateDraftBody(
  body: unknown,
):
  | {
      ok: true;
      value: { title?: string; slug?: string; body?: string };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as {
    title?: unknown;
    slug?: unknown;
    body?: unknown;
  };
  const result: { title?: string; slug?: string; body?: string } = {};
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
  return { ok: true, value: result };
}

export function contentRoutes(
  app: Hono,
  options?: ContentRoutesOptions,
): void {
  const defaultOrgId = (options?.defaultOrgId ?? DEV_DEFAULT_ORG_ID) as OrgId;

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
      data: {
        slug: page.published!.slug,
        title: page.published!.title,
        body: page.published!.body,
        publishedAt: page.published!.publishedAt,
      },
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
          draft: {
            title: page.draft.title,
            slug: page.draft.slug,
            body: page.draft.body,
            updatedAt: page.draft.updatedAt,
          },
          published: page.published
            ? {
                title: page.published.title,
                slug: page.published.slug,
                body: page.published.body,
                publishedAt: page.published.publishedAt,
              }
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

      const result = contentService.createPage({
        title: validated.value.title,
        slug: validated.value.slug,
        body: validated.value.body,
        organizationId: session.organizationId as OrgId,
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
            draft: {
              title: page.draft.title,
              slug: page.draft.slug,
              body: page.draft.body,
              updatedAt: page.draft.updatedAt,
            },
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
          draft: {
            title: page.draft.title,
            slug: page.draft.slug,
            body: page.draft.body,
            updatedAt: page.draft.updatedAt,
          },
          published: page.published
            ? {
                title: page.published.title,
                slug: page.published.slug,
                body: page.published.body,
                publishedAt: page.published.publishedAt,
              }
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
      return c.json({
        data: {
          id: page.id,
          organizationId: page.organizationId,
          status: page.status,
          draft: {
            title: page.draft.title,
            slug: page.draft.slug,
            body: page.draft.body,
            updatedAt: page.draft.updatedAt,
          },
          published: page.published
            ? {
                title: page.published.title,
                slug: page.published.slug,
                body: page.published.body,
                publishedAt: page.published.publishedAt,
              }
            : null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          version: page.version,
        },
      });
    },
  );

  app.route("/api/content", management);
}

// Export service for testing
export { contentService, ContentService };
