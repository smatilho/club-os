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

import MemberLayout from "./layout";

describe("MemberLayout", () => {
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
      MemberLayout({ children: <div>Member Content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT:/public");
    expect(redirectMock).toHaveBeenCalledWith("/public");
  });

  it("renders the member area for authenticated users", async () => {
    const session: SessionContext = {
      userId: "user-123",
      organizationId: "org-1",
      roles: ["member"],
      capabilities: ["membership.read"],
    };
    getSessionMock.mockResolvedValue(session);

    const ui = await MemberLayout({ children: <div>Member Content</div> });
    render(ui);

    expect(screen.getByText("Member Portal")).toBeInTheDocument();
    expect(screen.getByText("user-123")).toBeInTheDocument();
    expect(screen.getByText("Member Content")).toBeInTheDocument();
  });
});
