import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockAuthMiddleware } from "./mock-auth-middleware";
import {
  requireCapability,
  setAuditWriter,
} from "./policy-middleware";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";

function createTestApp() {
  const app = new Hono();
  app.use("*", mockAuthMiddleware);
  app.get(
    "/protected",
    requireCapability("membership.read", "membership"),
    (c) => c.json({ access: "granted" }),
  );
  app.post(
    "/manage",
    requireCapability("membership.manage", "membership"),
    (c) => c.json({ access: "granted" }),
  );
  app.get(
    "/tenant/:id",
    requireCapability("membership.read", "membership", {
      extractResource: (c) => ({
        id: c.req.param("id") ?? "",
        organizationId: "other-org",
      }),
    }),
    (c) => c.json({ access: "granted" }),
  );
  return app;
}

describe("requireCapability middleware", () => {
  let auditWriter: InMemoryAuditWriter;

  beforeEach(() => {
    auditWriter = new InMemoryAuditWriter();
    setAuditWriter(auditWriter);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = createTestApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  it("allows when role has required capability", async () => {
    const app = createTestApp();
    const res = await app.request("/protected", {
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "member",
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access).toBe("granted");
  });

  it("denies when role lacks required capability", async () => {
    const app = createTestApp();
    const res = await app.request("/manage", {
      method: "POST",
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "member",
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reasonCode).toBe("DENY_CAPABILITY_MISSING");
  });

  it("allows org_admin for management capability", async () => {
    const app = createTestApp();
    const res = await app.request("/manage", {
      method: "POST",
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "org_admin",
      },
    });
    expect(res.status).toBe(200);
  });

  it("writes audit entry on allow", async () => {
    const app = createTestApp();
    await app.request("/protected", {
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "member",
      },
    });
    expect(auditWriter.entries).toHaveLength(1);
    expect(auditWriter.entries[0].decision.effect).toBe("allow");
    expect(auditWriter.entries[0].action).toBe("membership.read");
  });

  it("writes audit entry on deny", async () => {
    const app = createTestApp();
    await app.request("/manage", {
      method: "POST",
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "member",
      },
    });
    expect(auditWriter.entries).toHaveLength(1);
    expect(auditWriter.entries[0].decision.effect).toBe("deny");
    expect(auditWriter.entries[0].decision.reasonCode).toBe(
      "DENY_CAPABILITY_MISSING",
    );
  });

  it("includes actor and resource in audit entry", async () => {
    const app = createTestApp();
    await app.request("/protected", {
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "member",
      },
    });
    const entry = auditWriter.entries[0];
    expect(entry.actor.userId).toBe("u1");
    expect(entry.actor.organizationId).toBe("org1");
    expect(entry.resource.type).toBe("membership");
  });

  it("denies and audits tenant mismatch when resource org differs", async () => {
    const app = createTestApp();
    const res = await app.request("/tenant/m123", {
      headers: {
        "x-mock-user-id": "u1",
        "x-mock-org-id": "org1",
        "x-mock-roles": "org_admin",
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
    expect(auditWriter.entries).toHaveLength(1);
    expect(auditWriter.entries[0].decision.reasonCode).toBe(
      "DENY_RESOURCE_TENANT_MISMATCH",
    );
    expect(auditWriter.entries[0].resource.organizationId).toBe("other-org");
  });
});
