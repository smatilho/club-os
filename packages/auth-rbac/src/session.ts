import type { Capability } from "./index";

export interface SessionContext {
  userId: string;
  organizationId: string;
  roles: string[];
  capabilities: Capability[];
}
