import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import {
  evaluatePolicy,
  resolveCapabilities,
  type Capability,
  type PolicyDecisionResponse,
  type Role,
  type AuditEntry,
  type AuditWriter,
} from "@club-os/auth-rbac";

/**
 * Shared audit writer instance. Set via setAuditWriter().
 * Defaults to a no-op writer until configured.
 */
let auditWriter: AuditWriter = {
  async write() {
    // no-op default
  },
};

export function setAuditWriter(writer: AuditWriter): void {
  auditWriter = writer;
}

export function getAuditWriter(): AuditWriter {
  return auditWriter;
}

interface PolicyAuditInput {
  requestContext: { timestamp: string; requestId: string };
  session: { userId: string; organizationId: string };
  capability: Capability;
  resourceType: string;
  resourceId: string;
  resourceOrganizationId: string;
  decision: PolicyDecisionResponse;
}

async function writePolicyAuditEntry(input: PolicyAuditInput): Promise<void> {
  const auditEntry: AuditEntry = {
    timestamp: input.requestContext.timestamp,
    requestId: input.requestContext.requestId,
    actor: {
      userId: input.session.userId,
      organizationId: input.session.organizationId,
    },
    action: input.capability,
    resource: {
      type: input.resourceType,
      id: input.resourceId,
      organizationId: input.resourceOrganizationId,
    },
    decision: {
      effect: input.decision.effect,
      reasonCode: input.decision.reasonCode,
    },
  };

  await auditWriter.write(auditEntry);
}

export interface PolicyResourceTarget {
  id: string;
  organizationId?: string;
}

export interface RequireCapabilityOptions {
  extractResource?: (c: Context) => PolicyResourceTarget | Promise<PolicyResourceTarget>;
}

/**
 * Creates a policy-enforcing middleware for a specific capability and resource type.
 * Extracts session from context, resolves capabilities from roles,
 * runs evaluatePolicy, and writes audit entries.
 *
 * Returns 401 if no session. Returns 403 with reason code if denied.
 */
export function requireCapability(
  capability: Capability,
  resourceType: string,
  options: RequireCapabilityOptions = {},
) {
  return createMiddleware(async (c: Context, next: Next) => {
    const session = c.get("session");
    const requestContext = c.get("requestContext");

    if (!session) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const capabilities = resolveCapabilities(session.roles as Role[]);

    // Update request context with resolved capabilities
    requestContext.capabilities = capabilities;

    const extracted = options.extractResource
      ? await options.extractResource(c)
      : { id: c.req.param("id") ?? "" };
    const resourceId = extracted.id;
    const resourceOrganizationId = extracted.organizationId ?? session.organizationId;

    const decision = evaluatePolicy(
      {
        actor: {
          userId: session.userId,
          organizationId: session.organizationId,
          roles: session.roles,
        },
        action: capability,
        resource: {
          type: resourceType,
          id: resourceId,
          organizationId: resourceOrganizationId,
        },
        context: {
          route: c.req.path,
          requestId: requestContext.requestId,
          ipHash: "",
          userAgentHash: "",
          timestamp: requestContext.timestamp,
        },
      },
      capabilities,
    );

    await writePolicyAuditEntry({
      requestContext,
      session,
      capability,
      resourceType,
      resourceId,
      resourceOrganizationId,
      decision,
    });

    if (decision.effect === "deny") {
      return c.json(
        {
          error: "Forbidden",
          reasonCode: decision.reasonCode,
        },
        403,
      );
    }

    await next();
  });
}
