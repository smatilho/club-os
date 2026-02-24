import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import MemberReservationsPage from "./page";

describe("MemberReservationsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders reservation list", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "res-1",
          resourceUnitId: "unit-1",
          startsAt: "2025-06-01T14:00:00Z",
          endsAt: "2025-06-03T11:00:00Z",
          status: "confirmed",
          totalAmount: { currency: "USD", amount: 5000 },
          source: "member_booking",
          createdAt: "2025-05-15T10:00:00Z",
          confirmedAt: "2025-05-15T10:01:00Z",
          canceledAt: null,
        },
      ],
    });

    const ui = await MemberReservationsPage();
    render(ui);

    expect(screen.getByText("My Reservations")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await MemberReservationsPage();
    render(ui);

    expect(screen.getByText(/No reservations yet/)).toBeInTheDocument();
  });

  it("renders error state", async () => {
    apiFetchMock.mockResolvedValue({
      ok: false,
      error: "Not authenticated",
    });

    const ui = await MemberReservationsPage();
    render(ui);

    expect(screen.getByText("Not authenticated")).toBeInTheDocument();
  });

  it("handles connection error", async () => {
    apiFetchMock.mockRejectedValue(new Error("Network error"));

    const ui = await MemberReservationsPage();
    render(ui);

    expect(screen.getByText("Unable to connect to API")).toBeInTheDocument();
  });
});
