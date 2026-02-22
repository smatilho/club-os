/**
 * Client-side session context shape.
 * Populated by auth provider in Phase 1.
 */
export interface SessionContext {
  userId: string;
  organizationId: string;
  roles: string[];
  capabilities: string[];
}

export function isAuthenticated(session: SessionContext | null): session is SessionContext {
  return session !== null && session.userId !== "";
}

export function hasRole(session: SessionContext, role: string): boolean {
  return session.roles.includes(role);
}
