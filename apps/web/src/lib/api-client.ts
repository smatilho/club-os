import { cookies } from "next/headers";

/**
 * Server-side API client for the Club OS API.
 * Reads mock session from cookie and forwards auth headers.
 *
 * Phase 2 uses a documented dev default org strategy for public endpoints.
 * Phase 3/5 will introduce proper tenant resolution via subdomain/host header.
 */

const API_BASE_URL =
  process.env.CLUB_OS_API_BASE_URL ?? "http://localhost:4000";

interface FetchOptions {
  method?: string;
  body?: unknown;
  cache?: RequestCache;
}

async function getMockAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const mockSession = cookieStore.get("mock-session");
  if (!mockSession) return {};

  let parsed: {
    userId?: string;
    organizationId?: string;
    roles?: string[];
  } | null = null;

  try {
    parsed = JSON.parse(mockSession.value);
  } catch {
    try {
      parsed = JSON.parse(decodeURIComponent(mockSession.value));
    } catch {
      return {};
    }
  }

  if (!parsed || !parsed.userId || !parsed.organizationId) return {};

  return {
    "x-mock-user-id": parsed.userId,
    "x-mock-org-id": parsed.organizationId,
    "x-mock-roles": (parsed.roles ?? ["member"]).join(","),
  };
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const authHeaders = await getMockAuthHeaders();
  const headers: Record<string, string> = {
    ...authHeaders,
  };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: json.error ?? "Unknown error",
    };
  }

  return { ok: true, data: json.data as T };
}

/**
 * Public API fetch — no auth headers needed.
 * Used for public content and theme endpoints.
 */
export async function publicApiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body !== undefined ? { "content-type": "application/json" } : {},
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: json.error ?? "Unknown error",
    };
  }

  return { ok: true, data: json.data as T };
}
