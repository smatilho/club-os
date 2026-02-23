import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { getDefaultAuthHandler } from "../../kernel/auth-handler";
import { OrgProfileService, validateThemeSettings } from "./service";
import type { OrgId } from "@club-os/domain-core";

const orgProfileService = new OrgProfileService();

/**
 * Dev default org for public theme endpoint.
 * Same strategy as content module — Phase 3/5 will replace with proper tenant resolution.
 */
const DEV_DEFAULT_ORG_ID = "org-default";

interface OrgProfileRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
  defaultOrgId?: string;
}

function getAuthHandler(
  options?: OrgProfileRoutesOptions,
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

export function orgProfileRoutes(
  app: Hono,
  options?: OrgProfileRoutesOptions,
): void {
  const defaultOrgId = (options?.defaultOrgId ?? DEV_DEFAULT_ORG_ID) as OrgId;

  // --- Public theme endpoint (no auth) for web SSR ---
  const publicProfile = new Hono();
  publicProfile.get("/theme", async (c) => {
    const theme = orgProfileService.getTheme(defaultOrgId);
    return c.json({ data: theme });
  });
  app.route("/api/org-profile/public", publicProfile);

  // --- Management routes (auth + policy) ---
  const management = new Hono();
  management.use("*", getAuthHandler(options));

  management.get(
    "/theme",
    requireCapability("settings.read", "org-profile"),
    async (c) => {
      const session = c.get("session")!;
      const theme = orgProfileService.getTheme(
        session.organizationId as OrgId,
      );
      return c.json({ data: theme });
    },
  );

  management.put(
    "/theme",
    requireCapability("settings.manage", "org-profile"),
    async (c) => {
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) {
        return c.json({ error: parsedBody.error }, 400);
      }
      const validated = validateThemeSettings(parsedBody.value);
      if (!validated.ok) {
        return c.json({ error: validated.error }, 400);
      }
      const session = c.get("session")!;

      const result = orgProfileService.updateTheme(
        session.organizationId as OrgId,
        validated.value,
      );
      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }
      return c.json({ data: result.value });
    },
  );

  app.route("/api/org-profile", management);
}

export { orgProfileService, OrgProfileService };
