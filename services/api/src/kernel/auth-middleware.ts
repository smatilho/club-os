import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import type { RequestContext } from "./context";

/**
 * Session extracted from verified auth token claims.
 * Mock-header auth is implemented in mock-auth-middleware.ts for local/test only.
 */
export interface AuthSession {
  userId: string;
  organizationId: string;
  roles: string[];
}

declare module "hono" {
  interface ContextVariableMap {
    session: AuthSession | null;
    requestContext: RequestContext;
  }
}

export function createRequestContext(session: AuthSession | null, requestId: string): RequestContext {
  return {
    requestId,
    organizationId: session?.organizationId ?? "",
    actorId: session?.userId ?? null,
    capabilities: [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Auth middleware: production-safe auth entrypoint.
 * Reads Bearer token only (real token verification via AuthClaimsPort is wired in later phase).
 * Mock headers are intentionally ignored here.
 */
export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const authorization = c.req.header("authorization");

  let session: AuthSession | null = null;

  if (authorization?.startsWith("Bearer ")) {
    // Phase 2+: replace with AuthClaimsPort.verify(token) and map claims to AuthSession.
    // We intentionally do not trust mock headers in this middleware.
    session = null;
  }

  const requestContext = createRequestContext(session, requestId);

  c.set("session", session);
  c.set("requestContext", requestContext);

  await next();
});
