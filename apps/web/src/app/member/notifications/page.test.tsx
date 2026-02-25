import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("./mark-read-button", () => ({
  MarkReadButton: ({ notificationId }: { notificationId: string }) => (
    <button data-testid={`mark-read-${notificationId}`}>Mark as read</button>
  ),
}));

import MemberNotificationsPage from "./page";

describe("MemberNotificationsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders notifications", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "n1",
          topic: "event",
          title: "New Event Published",
          body: "Check it out",
          status: "delivered",
          readAt: null,
          createdAt: "2025-06-01T10:00:00Z",
        },
      ],
    });

    const ui = await MemberNotificationsPage();
    render(ui);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("1 unread notification")).toBeInTheDocument();
    expect(screen.getByText("New Event Published")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await MemberNotificationsPage();
    render(ui);

    expect(screen.getByText("No notifications.")).toBeInTheDocument();
  });

  it("renders all caught up for read notifications", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "n2",
          topic: "event",
          title: "Old Event",
          body: "Already seen",
          status: "delivered",
          readAt: "2025-06-01T11:00:00Z",
          createdAt: "2025-06-01T10:00:00Z",
        },
      ],
    });

    const ui = await MemberNotificationsPage();
    render(ui);

    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("renders error", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Unauthorized" });

    const ui = await MemberNotificationsPage();
    render(ui);

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });
});
