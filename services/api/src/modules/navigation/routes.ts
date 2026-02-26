import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { NavigationService } from "./service";
import type {
  MenuItemId,
  MenuLocation,
  MenuItemVisibility,
  MenuItemLinkType,
  OrgId,
  ContentPageId,
} from "@club-os/domain-core";

const DEV_DEFAULT_ORG_ID = "org-default";

const navigationService = new NavigationService();

const VALID_LOCATIONS = [
  "public_header",
  "public_footer",
  "member_primary",
  "admin_primary",
];

const VALID_LINK_TYPES = ["internal_page", "internal_path", "external"];
const VALID_VISIBILITIES = ["always", "authenticated", "unauthenticated"];

interface NavigationRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  defaultOrgId?: string;
}

function getNavAuthHandler(
  options?: NavigationRoutesOptions,
): MiddlewareHandler {
  if (options?.authHandler) return options.authHandler;
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

function extractMenuItemResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const item = navigationService.getItemById(id as MenuItemId);
  return {
    id,
    organizationId: item
      ? item.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

function validateCreateItemBody(
  body: unknown,
):
  | {
      ok: true;
      value: {
        location: MenuLocation;
        label: string;
        linkType: MenuItemLinkType;
        linkTarget: string;
        parentId?: string | null;
        sortOrder?: number;
        visibility?: MenuItemVisibility;
        contentPageId?: string | null;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.label !== "string" || b.label.trim() === "") {
    return { ok: false, error: "label must be a non-empty string" };
  }
  if (typeof b.location !== "string" || !VALID_LOCATIONS.includes(b.location)) {
    return { ok: false, error: "location must be one of: " + VALID_LOCATIONS.join(", ") };
  }
  if (typeof b.linkType !== "string" || !VALID_LINK_TYPES.includes(b.linkType)) {
    return { ok: false, error: "linkType must be one of: " + VALID_LINK_TYPES.join(", ") };
  }
  if (typeof b.linkTarget !== "string" || b.linkTarget.trim() === "") {
    return { ok: false, error: "linkTarget must be a non-empty string" };
  }

  if (b.visibility !== undefined && !VALID_VISIBILITIES.includes(b.visibility as string)) {
    return { ok: false, error: "visibility must be one of: " + VALID_VISIBILITIES.join(", ") };
  }

  if (b.sortOrder !== undefined && typeof b.sortOrder !== "number") {
    return { ok: false, error: "sortOrder must be a number" };
  }

  return {
    ok: true,
    value: {
      location: b.location as MenuLocation,
      label: b.label as string,
      linkType: b.linkType as MenuItemLinkType,
      linkTarget: b.linkTarget as string,
      parentId: (b.parentId as string | null | undefined) ?? null,
      sortOrder: b.sortOrder as number | undefined,
      visibility: b.visibility as MenuItemVisibility | undefined,
      contentPageId: (b.contentPageId as string | null | undefined) ?? null,
    },
  };
}

function validateUpdateItemBody(
  body: unknown,
):
  | {
      ok: true;
      value: {
        label?: string;
        linkTarget?: string;
        linkType?: MenuItemLinkType;
        sortOrder?: number;
        visibility?: MenuItemVisibility;
        parentId?: string | null;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const b = body as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (b.label !== undefined) {
    if (typeof b.label !== "string") return { ok: false, error: "label must be a string" };
    result.label = b.label;
  }
  if (b.linkTarget !== undefined) {
    if (typeof b.linkTarget !== "string") return { ok: false, error: "linkTarget must be a string" };
    result.linkTarget = b.linkTarget;
  }
  if (b.linkType !== undefined) {
    if (!VALID_LINK_TYPES.includes(b.linkType as string)) {
      return { ok: false, error: "linkType must be one of: " + VALID_LINK_TYPES.join(", ") };
    }
    result.linkType = b.linkType;
  }
  if (b.sortOrder !== undefined) {
    if (typeof b.sortOrder !== "number") return { ok: false, error: "sortOrder must be a number" };
    result.sortOrder = b.sortOrder;
  }
  if (b.visibility !== undefined) {
    if (!VALID_VISIBILITIES.includes(b.visibility as string)) {
      return { ok: false, error: "visibility must be one of: " + VALID_VISIBILITIES.join(", ") };
    }
    result.visibility = b.visibility;
  }
  if (b.parentId !== undefined) {
    result.parentId = b.parentId;
  }

  return { ok: true, value: result as any };
}

function serializeItem(item: {
  id: string;
  organizationId: string;
  location: string;
  label: string;
  linkType: string;
  linkTarget: string;
  parentId: string | null;
  sortOrder: number;
  visibility: string;
  contentPageId: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: item.id,
    organizationId: item.organizationId,
    location: item.location,
    label: item.label,
    linkType: item.linkType,
    linkTarget: item.linkTarget,
    parentId: item.parentId,
    sortOrder: item.sortOrder,
    visibility: item.visibility,
    contentPageId: item.contentPageId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function navigationRoutes(
  app: Hono,
  options?: NavigationRoutesOptions,
): void {
  const defaultOrgId = (options?.defaultOrgId ?? DEV_DEFAULT_ORG_ID) as OrgId;

  // --- Public routes (no auth) ---
  const publicNav = new Hono();

  publicNav.get("/menus/:location", async (c) => {
    const location = c.req.param("location");
    if (!VALID_LOCATIONS.includes(location)) {
      return c.json({ error: "Invalid menu location" }, 400);
    }

    const items = navigationService.listByLocation(
      defaultOrgId,
      location as MenuLocation,
    );

    // Filter by visibility for public access
    const filtered = items.filter(
      (item) => item.visibility === "always" || item.visibility === "unauthenticated",
    );

    return c.json({
      data: filtered.map(serializeItem),
    });
  });

  app.route("/api/navigation", publicNav);

  // --- Admin routes (auth + policy) ---
  const admin = new Hono();
  admin.use("*", getNavAuthHandler(options));

  // List all menus
  admin.get(
    "/menus",
    requireCapability("navigation.read", "menu-item"),
    async (c) => {
      const session = c.get("session")!;
      const items = navigationService.listAll(session.organizationId as OrgId);
      return c.json({ data: items.map(serializeItem) });
    },
  );

  // List by location
  admin.get(
    "/menus/:location",
    requireCapability("navigation.read", "menu-item"),
    async (c) => {
      const location = c.req.param("location");
      if (!VALID_LOCATIONS.includes(location)) {
        return c.json({ error: "Invalid menu location" }, 400);
      }
      const session = c.get("session")!;
      const items = navigationService.listByLocation(
        session.organizationId as OrgId,
        location as MenuLocation,
      );
      return c.json({ data: items.map(serializeItem) });
    },
  );

  // Create menu item
  admin.post(
    "/menu-items",
    requireCapability("navigation.write", "menu-item"),
    async (c) => {
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const validated = validateCreateItemBody(parsedBody.value);
      if (!validated.ok) return c.json({ error: validated.error }, 400);

      const session = c.get("session")!;
      const result = navigationService.createItem({
        organizationId: session.organizationId as OrgId,
        location: validated.value.location,
        label: validated.value.label,
        linkType: validated.value.linkType,
        linkTarget: validated.value.linkTarget,
        parentId: validated.value.parentId as MenuItemId | null | undefined,
        sortOrder: validated.value.sortOrder,
        visibility: validated.value.visibility,
        contentPageId: validated.value.contentPageId as ContentPageId | null | undefined,
      });

      if (!result.ok) return c.json({ error: result.error }, 400);
      return c.json({ data: serializeItem(result.value) }, 201);
    },
  );

  // Update menu item
  admin.patch(
    "/menu-items/:id",
    requireCapability("navigation.write", "menu-item", {
      extractResource: extractMenuItemResource,
    }),
    async (c) => {
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) return c.json({ error: parsedBody.error }, 400);

      const validated = validateUpdateItemBody(parsedBody.value);
      if (!validated.ok) return c.json({ error: validated.error }, 400);

      const session = c.get("session")!;
      const result = navigationService.updateItem(
        c.req.param("id") as MenuItemId,
        session.organizationId as OrgId,
        {
          ...validated.value,
          parentId: validated.value.parentId as MenuItemId | null | undefined,
        },
      );

      if (!result.ok) {
        const status = result.error === "Menu item not found" ? 404 : 400;
        return c.json({ error: result.error }, status);
      }
      return c.json({ data: serializeItem(result.value) });
    },
  );

  // Delete menu item
  admin.delete(
    "/menu-items/:id",
    requireCapability("navigation.write", "menu-item", {
      extractResource: extractMenuItemResource,
    }),
    async (c) => {
      const session = c.get("session")!;
      const result = navigationService.deleteItem(
        c.req.param("id") as MenuItemId,
        session.organizationId as OrgId,
      );

      if (!result.ok) {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ data: { deleted: true } });
    },
  );

  app.route("/api/admin/navigation", admin);
}

export { navigationService, NavigationService };
