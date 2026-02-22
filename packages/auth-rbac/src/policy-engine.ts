import type { Capability } from "./index";

export interface PolicyActor {
  userId: string;
  organizationId: string;
  roles: string[];
}

export interface PolicyResource {
  type: string;
  id: string;
  organizationId: string;
}

export interface PolicyRequestContext {
  route: string;
  requestId: string;
  ipHash: string;
  userAgentHash: string;
  timestamp: string;
}

export interface PolicyDecisionRequest {
  actor: PolicyActor;
  action: Capability;
  resource: PolicyResource;
  context: PolicyRequestContext;
}

export type PolicyReasonCode =
  | "ALLOW_ROLE_CAPABILITY"
  | "DENY_CAPABILITY_MISSING"
  | "DENY_SCOPE_MISMATCH"
  | "DENY_RESOURCE_TENANT_MISMATCH"
  | "DENY_BREAK_GLASS_EXPIRED"
  | "DENY_POLICY_CONDITION_FAILED";

export interface PolicyObligations {
  requireAudit?: boolean;
  redactFields?: string[];
  ttlSeconds?: number;
}

export interface PolicyDecisionResponse {
  effect: "allow" | "deny";
  reasonCode: PolicyReasonCode;
  obligations?: PolicyObligations;
}

export function evaluatePolicy(
  request: PolicyDecisionRequest,
  actorCapabilities: Capability[],
): PolicyDecisionResponse {
  if (request.actor.organizationId !== request.resource.organizationId) {
    return {
      effect: "deny",
      reasonCode: "DENY_RESOURCE_TENANT_MISMATCH",
    };
  }

  if (!actorCapabilities.includes(request.action)) {
    return {
      effect: "deny",
      reasonCode: "DENY_CAPABILITY_MISSING",
    };
  }

  return {
    effect: "allow",
    reasonCode: "ALLOW_ROLE_CAPABILITY",
    obligations: {
      requireAudit: true,
    },
  };
}
