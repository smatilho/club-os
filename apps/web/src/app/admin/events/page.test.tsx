import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import AdminEventsPage from "./page";

describe("AdminEventsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders events table", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "ev1",
          title: "Board Meeting",
          description: "Quarterly",
          startsAt: "2025-07-01T14:00:00Z",
          endsAt: "2025-07-01T16:00:00Z",
          location: "Room A",
          capacity: 20,
          status: "draft",
          createdByUserId: "admin-1",
          publishedAt: null,
          canceledAt: null,
          rsvpCount: 5,
        },
      ],
    });

    const ui = await AdminEventsPage();
    render(ui);

    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Board Meeting")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("Detail")).toBeInTheDocument();
    expect(screen.getByText("+ New Event")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await AdminEventsPage();
    render(ui);

    expect(
      screen.getByText("No events yet. Create your first event to get started."),
    ).toBeInTheDocument();
  });

  it("renders error", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Forbidden" });

    const ui = await AdminEventsPage();
    render(ui);

    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });
});
