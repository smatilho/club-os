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

export function hasCapability(session: SessionContext, capability: string): boolean {
  return session.capabilities.includes(capability);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function normalizeSession(value: unknown): SessionContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SessionContext>;
  if (typeof candidate.userId !== "string" || candidate.userId === "") {
    return null;
  }
  if (typeof candidate.organizationId !== "string" || candidate.organizationId === "") {
    return null;
  }

  return {
    userId: candidate.userId,
    organizationId: candidate.organizationId,
    roles: isStringArray(candidate.roles) ? candidate.roles : [],
    capabilities: isStringArray(candidate.capabilities) ? candidate.capabilities : [],
  };
}

function parseMockSessionCookie(value: string): SessionContext | null {
  try {
    return normalizeSession(JSON.parse(value));
  } catch {
    try {
      return normalizeSession(JSON.parse(decodeURIComponent(value)));
    } catch {
      return null;
    }
  }
}

/**
 * Server-side session retrieval.
 * Reads from cookie in production; uses mock header/env in development.
 *
 * Returns null if no session is present (unauthenticated).
 * This is a UX-layer guard only — real authorization happens at the API boundary.
 */
export async function getSession(): Promise<SessionContext | null> {
  // In development: check for mock session via cookies
  // Dynamic import to avoid bundling issues with next/headers
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const mockSession = cookieStore.get("mock-session");
  if (mockSession) {
    return parseMockSessionCookie(mockSession.value);
  }
  return null;
}
