import type { Hono } from "hono";

export function healthRoutes(app: Hono): void {
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });
}
