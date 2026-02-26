import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionContext } from "../../lib/session";

const { redirectMock, getSessionMock, apiFetchMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getSessionMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("../../lib/session", async () => {
  const actual = await vi.importActual<typeof import("../../lib/session")>(
    "../../lib/session",
  );
  return {
    ...actual,
    getSession: getSessionMock,
  };
});

vi.mock("../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import AdminLayout from "./layout";

describe("AdminLayout", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getSessionMock.mockReset();
    apiFetchMock.mockReset();
    // Default: nav returns empty
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });
  });

  it("redirects unauthenticated users to /public", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: <div>Admin Content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT:/public");
    expect(redirectMock).toHaveBeenCalledWith("/public");
  });

  it("redirects authenticated users without management capabilities to /member", async () => {
    const session: SessionContext = {
      userId: "user-123",
      organizationId: "org-1",
      roles: ["member"],
      capabilities: ["membership.read"],
    };
    getSessionMock.mockResolvedValue(session);

    await expect(
      AdminLayout({ children: <div>Admin Content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT:/member");
    expect(redirectMock).toHaveBeenCalledWith("/member");
  });

  it("renders the admin area when a management capability is present", async () => {
    const session: SessionContext = {
      userId: "admin-1",
      organizationId: "org-1",
      roles: ["webmaster"],
      capabilities: ["content.publish"],
    };
    getSessionMock.mockResolvedValue(session);

    const ui = await AdminLayout({ children: <div>Admin Content</div> });
    render(ui);

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText(/admin-1/)).toBeInTheDocument();
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
