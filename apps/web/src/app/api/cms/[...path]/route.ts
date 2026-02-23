import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * API proxy route for CMS client-side operations.
 * Forwards requests to the backend API with mock auth headers from the session cookie.
 * This avoids exposing the API base URL to the client and keeps auth on the server side.
 */

const API_BASE_URL =
  process.env.CLUB_OS_API_BASE_URL ?? "http://localhost:4000";

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

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const apiPath = `/api/${path.join("/")}`;
  const apiUrl = `${API_BASE_URL}${apiPath}${request.nextUrl.search}`;
  const authHeaders = await getMockAuthHeaders();

  const headers: Record<string, string> = { ...authHeaders };
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["content-type"] = contentType;
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  const res = await fetch(apiUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseBody = await res.text();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
