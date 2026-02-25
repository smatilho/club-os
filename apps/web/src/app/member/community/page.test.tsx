import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import CommunityFeedPage from "./page";

describe("CommunityFeedPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders post list", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "p1",
          title: "Hello World",
          body: "test",
          authorUserId: "user-1",
          tags: ["general"],
          status: "visible",
          commentCount: 3,
          createdAt: "2025-06-01T10:00:00Z",
          updatedAt: "2025-06-01T10:00:00Z",
        },
      ],
    });

    const ui = await CommunityFeedPage();
    render(ui);

    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("general")).toBeInTheDocument();
    expect(screen.getByText("3 comments")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await CommunityFeedPage();
    render(ui);

    expect(screen.getByText("No posts yet")).toBeInTheDocument();
  });

  it("renders error", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Unauthorized" });

    const ui = await CommunityFeedPage();
    render(ui);

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });

  it("shows hidden post message", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "p2",
          title: "Secret",
          body: "hidden content",
          authorUserId: "user-2",
          tags: [],
          status: "hidden",
          commentCount: 0,
          createdAt: "2025-06-01T10:00:00Z",
          updatedAt: "2025-06-01T10:00:00Z",
        },
      ],
    });

    const ui = await CommunityFeedPage();
    render(ui);

    expect(
      screen.getByText("[This post has been hidden by a moderator]"),
    ).toBeInTheDocument();
  });
});
