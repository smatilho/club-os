import type { Capability } from "./index";
import type { PolicyReasonCode } from "./policy-engine";

export interface AuditEntry {
  timestamp: string;
  requestId: string;
  actor: {
    userId: string;
    organizationId: string;
  };
  action: Capability | string;
  resource: {
    type: string;
    id: string;
    organizationId: string;
  };
  decision: {
    effect: "allow" | "deny";
    reasonCode: PolicyReasonCode;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Port interface for audit log writing.
 * Infrastructure layer provides concrete adapter (DB, file, external service).
 */
export interface AuditWriter {
  write(entry: AuditEntry): Promise<void>;
}

/**
 * In-memory audit writer for development and testing.
 */
export class InMemoryAuditWriter implements AuditWriter {
  readonly entries: AuditEntry[] = [];

  async write(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  clear(): void {
    this.entries.length = 0;
  }
}
