export type Capability =
  | "content.read"
  | "content.write"
  | "content.publish"
  | "membership.read"
  | "membership.manage"
  | "reservation.read"
  | "reservation.manage"
  | "reservation.override"
  | "finance.read"
  | "finance.manage"
  | "finance.refund"
  | "community.read"
  | "community.moderate"
  | "settings.read"
  | "settings.manage"
  | "audit.read";

export interface PolicyContext {
  actorId: string;
  organizationId: string;
  capabilities: Capability[];
}

export function hasCapability(
  context: PolicyContext,
  capability: Capability,
): boolean {
  return context.capabilities.includes(capability);
}

export * from "./policy-engine";
export * from "./session";
export * from "./roles";
export * from "./audit";
