import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import MemberEventsPage from "./page";

describe("MemberEventsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders event list", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: "ev1",
            title: "Summer Party",
            description: "Fun",
            startsAt: "2025-07-01T18:00:00Z",
            endsAt: "2025-07-01T22:00:00Z",
            location: "Pool",
            capacity: 50,
            status: "published",
            createdByUserId: "admin-1",
            publishedAt: "2025-06-15T10:00:00Z",
            canceledAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({ ok: true, data: [] });

    const ui = await MemberEventsPage();
    render(ui);

    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
    expect(screen.getByText("Summer Party")).toBeInTheDocument();
    expect(screen.getByText(/Pool/)).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: true, data: [] });

    const ui = await MemberEventsPage();
    render(ui);

    expect(screen.getByText("No upcoming events.")).toBeInTheDocument();
  });

  it("renders error", async () => {
    apiFetchMock
      .mockResolvedValueOnce({ ok: false, error: "Forbidden" })
      .mockResolvedValueOnce({ ok: true, data: [] });

    const ui = await MemberEventsPage();
    render(ui);

    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });
});
