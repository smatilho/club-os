import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import type { AuthSession } from "./auth-middleware";
import { createRequestContext } from "./auth-middleware";

/**
 * Mock auth middleware for local development and tests only.
 * This must not be used in production route bootstrap.
 */
export const mockAuthMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const authorization = c.req.header("authorization");

  let session: AuthSession | null = null;

  // Bearer token takes precedence; mock headers are ignored when present.
  if (!authorization?.startsWith("Bearer ")) {
    const mockUserId = c.req.header("x-mock-user-id");
    const mockOrgId = c.req.header("x-mock-org-id");
    const mockRoles = c.req.header("x-mock-roles");

    if (mockUserId && mockOrgId) {
      session = {
        userId: mockUserId,
        organizationId: mockOrgId,
        roles: mockRoles ? mockRoles.split(",") : ["member"],
      };
    }
  }

  c.set("session", session);
  c.set("requestContext", createRequestContext(session, requestId));

  await next();
});
