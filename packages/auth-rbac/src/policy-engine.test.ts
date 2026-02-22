import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "./policy-engine";
import type { PolicyDecisionRequest } from "./policy-engine";
import type { Capability } from "./index";

function makeRequest(
  overrides: Partial<PolicyDecisionRequest> = {},
): PolicyDecisionRequest {
  return {
    actor: { userId: "u1", organizationId: "org1", roles: ["member"] },
    action: "reservation.read",
    resource: { type: "reservation", id: "r1", organizationId: "org1" },
    context: {
      route: "/api/reservations/r1",
      requestId: "req1",
      ipHash: "hash",
      userAgentHash: "hash",
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe("evaluatePolicy", () => {
  it("denies when tenant mismatches", () => {
    const request = makeRequest({
      resource: { type: "reservation", id: "r1", organizationId: "org2" },
    });
    const result = evaluatePolicy(request, ["reservation.read"]);
    expect(result.effect).toBe("deny");
    expect(result.reasonCode).toBe("DENY_RESOURCE_TENANT_MISMATCH");
  });

  it("denies when capability missing", () => {
    const request = makeRequest();
    const result = evaluatePolicy(request, []);
    expect(result.effect).toBe("deny");
    expect(result.reasonCode).toBe("DENY_CAPABILITY_MISSING");
  });

  it("allows when capability present and tenant matches", () => {
    const request = makeRequest();
    const result = evaluatePolicy(request, ["reservation.read"]);
    expect(result.effect).toBe("allow");
    expect(result.reasonCode).toBe("ALLOW_ROLE_CAPABILITY");
    expect(result.obligations?.requireAudit).toBe(true);
  });

  it("denies unrelated capability even when others present", () => {
    const request = makeRequest({ action: "finance.manage" });
    const caps: Capability[] = ["reservation.read", "content.read"];
    const result = evaluatePolicy(request, caps);
    expect(result.effect).toBe("deny");
    expect(result.reasonCode).toBe("DENY_CAPABILITY_MISSING");
  });
});
