import type { MiddlewareHandler } from "hono";
import { authMiddleware } from "./auth-middleware";
import { mockAuthMiddleware } from "./mock-auth-middleware";

/**
 * Returns the appropriate auth middleware handler for the current environment.
 * In production: real auth (Bearer token verification).
 * In development/test: mock auth (x-mock-* headers).
 */
export function getDefaultAuthHandler(): MiddlewareHandler {
  if (process.env.NODE_ENV === "production") {
    return authMiddleware;
  }
  return mockAuthMiddleware;
}
