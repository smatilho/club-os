import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { authMiddleware } from "../../kernel/auth-middleware";
import { mockAuthMiddleware } from "../../kernel/mock-auth-middleware";
import { requireCapability } from "../../kernel/policy-middleware";
import { IdentityService } from "./service";
import {
  TENANT_ROLE_NAMES,
  type OrgId,
  type UserId,
  type MembershipId,
  type TenantRoleName,
} from "@club-os/domain-core";

const identityService = new IdentityService();
const VALID_ROLES = new Set<string>(TENANT_ROLE_NAMES);

interface IdentityRoutesOptions {
  auth?: "real" | "mock";
  authHandler?: MiddlewareHandler;
}

function getIdentityAuthHandler(options?: IdentityRoutesOptions): MiddlewareHandler {
  if (options?.authHandler) {
    return options.authHandler;
  }
  return options?.auth === "mock" ? mockAuthMiddleware : authMiddleware;
}

function isTenantRoleName(value: unknown): value is TenantRoleName {
  return typeof value === "string" && VALID_ROLES.has(value);
}

async function readJsonBody<T>(c: Context): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const body = await c.req.json<T>();
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

function validateCreateMembershipBody(
  body: unknown,
): { ok: true; value: { userId: string; roles: TenantRoleName[] } } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as { userId?: unknown; roles?: unknown };
  if (typeof candidate.userId !== "string" || candidate.userId.trim() === "") {
    return { ok: false, error: "userId must be a non-empty string" };
  }
  if (!Array.isArray(candidate.roles) || candidate.roles.length === 0) {
    return { ok: false, error: "roles must be a non-empty array" };
  }
  if (!candidate.roles.every(isTenantRoleName)) {
    return { ok: false, error: "roles contains invalid role value" };
  }
  return { ok: true, value: { userId: candidate.userId, roles: candidate.roles } };
}

function validateRoleBody(
  body: unknown,
): { ok: true; value: { role: TenantRoleName } } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as { role?: unknown };
  if (!isTenantRoleName(candidate.role)) {
    return { ok: false, error: "role must be a valid role name" };
  }
  return { ok: true, value: { role: candidate.role } };
}

function extractOrganizationResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const org = identityService.getOrganization(id as OrgId);
  return {
    id,
    organizationId: org.ok ? org.value.id : c.get("session")?.organizationId ?? "",
  };
}

function extractMembershipResource(c: Context) {
  const id = c.req.param("id") ?? "";
  const membership = identityService.getMembership(id as MembershipId);
  return {
    id,
    organizationId: membership.ok
      ? membership.value.organizationId
      : c.get("session")?.organizationId ?? "",
  };
}

export function identityRoutes(app: Hono, options?: IdentityRoutesOptions): void {
  const identity = new Hono();

  // All identity routes require authentication
  identity.use("*", getIdentityAuthHandler(options));

  // --- Organization ---

  identity.get(
    "/organizations/:id",
    requireCapability("membership.read", "organization", {
      extractResource: extractOrganizationResource,
    }),
    async (c) => {
      const result = identityService.getOrganization(
        c.req.param("id") as OrgId,
      );
      if (!result.ok) {
        return c.json({ error: result.error }, 404);
      }

      return c.json(result.value);
    },
  );

  // --- Memberships ---

  identity.get(
    "/memberships",
    requireCapability("membership.read", "membership"),
    async (c) => {
      const session = c.get("session")!;
      const memberships = identityService.listMembershipsForOrg(
        session.organizationId as OrgId,
      );
      return c.json({ data: memberships });
    },
  );

  identity.get(
    "/memberships/:id",
    requireCapability("membership.read", "membership", {
      extractResource: extractMembershipResource,
    }),
    async (c) => {
      const result = identityService.getMembership(
        c.req.param("id") as MembershipId,
      );
      if (!result.ok) {
        return c.json({ error: result.error }, 404);
      }

      return c.json(result.value);
    },
  );

  identity.post(
    "/memberships",
    requireCapability("membership.manage", "membership"),
    async (c) => {
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) {
        return c.json({ error: parsedBody.error }, 400);
      }
      const validated = validateCreateMembershipBody(parsedBody.value);
      if (!validated.ok) {
        return c.json({ error: validated.error }, 400);
      }
      const session = c.get("session")!;

      const result = identityService.createMembership({
        userId: validated.value.userId as UserId,
        organizationId: session.organizationId as OrgId,
        roles: validated.value.roles,
      });
      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }
      return c.json(result.value, 201);
    },
  );

  // --- Role assignments ---

  identity.post(
    "/memberships/:id/roles",
    requireCapability("membership.manage", "membership", {
      extractResource: extractMembershipResource,
    }),
    async (c) => {
      const membershipIdParam = c.req.param("id") as MembershipId;
      const parsedBody = await readJsonBody<unknown>(c);
      if (!parsedBody.ok) {
        return c.json({ error: parsedBody.error }, 400);
      }
      const validated = validateRoleBody(parsedBody.value);
      if (!validated.ok) {
        return c.json({ error: validated.error }, 400);
      }

      const membershipResult = identityService.getMembership(membershipIdParam);
      if (!membershipResult.ok) {
        return c.json({ error: membershipResult.error }, 404);
      }

      const result = identityService.assignRole(membershipIdParam, validated.value.role);
      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }
      return c.json(result.value);
    },
  );

  identity.delete(
    "/memberships/:id/roles/:role",
    requireCapability("membership.manage", "membership", {
      extractResource: extractMembershipResource,
    }),
    async (c) => {
      const membershipIdParam = c.req.param("id") as MembershipId;
      const roleParam = c.req.param("role");
      if (!isTenantRoleName(roleParam)) {
        return c.json({ error: "role must be a valid role name" }, 400);
      }
      const role = roleParam as TenantRoleName;

      const membershipResult = identityService.getMembership(membershipIdParam);
      if (!membershipResult.ok) {
        return c.json({ error: membershipResult.error }, 404);
      }

      const result = identityService.removeRole(membershipIdParam, role);
      if (!result.ok) {
        return c.json({ error: result.error }, 400);
      }
      return c.json(result.value);
    },
  );

  app.route("/api/identity", identity);
}

// Export service for testing
export { identityService, IdentityService, validateCreateMembershipBody, validateRoleBody };
