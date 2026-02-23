import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { mockAuthMiddleware } from "./mock-auth-middleware";

function createTestApp() {
  const app = new Hono();
  app.use("*", mockAuthMiddleware);
  app.get("/test", (c) => {
    const session = c.get("session");
    const ctx = c.get("requestContext");
    return c.json({ session, requestContext: ctx });
  });
  return app;
}

describe("mockAuthMiddleware", () => {
  it("sets null session when no mock headers present", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.session).toBeNull();
    expect(body.requestContext.actorId).toBeNull();
    expect(body.requestContext.organizationId).toBe("");
  });

  it("extracts mock session from headers", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: {
        "x-mock-user-id": "user-123",
        "x-mock-org-id": "org-456",
        "x-mock-roles": "member,treasurer",
      },
    });
    const body = await res.json();
    expect(body.session.userId).toBe("user-123");
    expect(body.session.organizationId).toBe("org-456");
    expect(body.session.roles).toEqual(["member", "treasurer"]);
    expect(body.requestContext.actorId).toBe("user-123");
    expect(body.requestContext.organizationId).toBe("org-456");
  });

  it("defaults to member role when roles header missing", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: {
        "x-mock-user-id": "user-123",
        "x-mock-org-id": "org-456",
      },
    });
    const body = await res.json();
    expect(body.session.roles).toEqual(["member"]);
  });

  it("requires both user-id and org-id for session", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {
      headers: { "x-mock-user-id": "user-123" },
    });
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  it("ignores mock headers when bearer token is present", async () => {
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
});
