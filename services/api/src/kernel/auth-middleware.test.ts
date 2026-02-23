import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "./auth-middleware";

function createTestApp() {
  const app = new Hono();
  app.use("*", authMiddleware);
  app.get("/test", (c) => {
    const session = c.get("session");
    const ctx = c.get("requestContext");
    return c.json({ session, requestContext: ctx });
  });
  return app;
}

describe("authMiddleware", () => {
  it("sets null session when no auth headers present", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.session).toBeNull();
    expect(body.requestContext.actorId).toBeNull();
    expect(body.requestContext.organizationId).toBe("");
  });

  it("ignores mock headers", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: {
        "x-mock-user-id": "user-123",
        "x-mock-org-id": "org-456",
        "x-mock-roles": "member,treasurer",
      },
    });
    const body = await res.json();
    expect(body.session).toBeNull();
    expect(body.requestContext.actorId).toBeNull();
    expect(body.requestContext.organizationId).toBe("");
  });

  it("keeps session null when bearer token is present but verification is not wired yet", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: {
        authorization: "Bearer fake-token",
        "x-mock-user-id": "user-123",
        "x-mock-org-id": "org-456",
      },
    });
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  it("sets a request id", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.requestContext.requestId).toBeDefined();
    expect(body.requestContext.requestId.length).toBeGreaterThan(0);
  });

  it("uses provided request id header", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: { "x-request-id": "custom-req-id" },
    });
    const body = await res.json();
    expect(body.requestContext.requestId).toBe("custom-req-id");
  });
});
