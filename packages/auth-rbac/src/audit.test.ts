import { describe, it, expect } from "vitest";
import { InMemoryAuditWriter, type AuditEntry } from "./audit";

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    requestId: "req-1",
    actor: { userId: "u1", organizationId: "org1" },
    action: "membership.manage",
    resource: { type: "membership", id: "m1", organizationId: "org1" },
    decision: { effect: "allow", reasonCode: "ALLOW_ROLE_CAPABILITY" },
    ...overrides,
  };
}

describe("InMemoryAuditWriter", () => {
  it("stores written entries", async () => {
    const writer = new InMemoryAuditWriter();
    const entry = makeEntry();
    await writer.write(entry);
    expect(writer.entries).toHaveLength(1);
    expect(writer.entries[0]).toBe(entry);
  });

  it("stores multiple entries in order", async () => {
    const writer = new InMemoryAuditWriter();
    await writer.write(makeEntry({ requestId: "req-1" }));
    await writer.write(makeEntry({ requestId: "req-2" }));
    expect(writer.entries).toHaveLength(2);
    expect(writer.entries[0].requestId).toBe("req-1");
    expect(writer.entries[1].requestId).toBe("req-2");
  });

  it("clears entries", async () => {
    const writer = new InMemoryAuditWriter();
    await writer.write(makeEntry());
    writer.clear();
    expect(writer.entries).toHaveLength(0);
  });

  it("logs deny decisions", async () => {
    const writer = new InMemoryAuditWriter();
    await writer.write(
      makeEntry({
        decision: { effect: "deny", reasonCode: "DENY_CAPABILITY_MISSING" },
      }),
    );
    expect(writer.entries[0].decision.effect).toBe("deny");
    expect(writer.entries[0].decision.reasonCode).toBe(
      "DENY_CAPABILITY_MISSING",
    );
  });
});
