import type { Capability } from "./index";

export type Role =
  | "member"
  | "reservationist"
  | "treasurer"
  | "webmaster"
  | "org_admin"
  | "platform_admin";

/**
 * Seed role → capability mappings per RBAC matrix v1.
 * org_admin gets all tenant-scoped capabilities.
 * platform_admin operates at platform scope (org lifecycle, incident ops).
 */

const MEMBER_CAPABILITIES: Capability[] = [
  "content.read",
  "community.read",
  "community.write",
  "community.comment",
  "community.report",
  "reservation.read",
  "membership.read",
  "events.read",
  "notifications.read",
];

export const ROLE_CAPABILITY_MAP: Record<Role, Capability[]> = {
  member: MEMBER_CAPABILITIES,
  reservationist: [
    ...MEMBER_CAPABILITIES,
    "reservation.manage",
    "reservation.override",
  ],
  treasurer: [
    ...MEMBER_CAPABILITIES,
    "finance.read",
    "finance.manage",
    "finance.refund",
  ],
  webmaster: [
    ...MEMBER_CAPABILITIES,
    "content.write",
    "content.publish",
    "settings.read",
  ],
  org_admin: [
    "content.read",
    "content.write",
    "content.publish",
    "membership.read",
    "membership.manage",
    "reservation.read",
    "reservation.manage",
    "reservation.override",
    "finance.read",
    "finance.manage",
    "finance.refund",
    "community.read",
    "community.write",
    "community.comment",
    "community.report",
    "community.moderate",
    "events.read",
    "events.write",
    "events.publish",
    "events.manage",
    "notifications.read",
    "settings.read",
    "settings.manage",
    "audit.read",
  ],
  platform_admin: [],
};

/**
 * Resolve the deduplicated set of capabilities for a list of roles.
 */
export function resolveCapabilities(roles: Role[]): Capability[] {
  const caps = new Set<Capability>();
  for (const role of roles) {
    const mapped = ROLE_CAPABILITY_MAP[role];
    if (mapped) {
      for (const cap of mapped) {
        caps.add(cap);
      }
    }
  }
  return [...caps];
}
