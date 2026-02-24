import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import AdminReservationsPage from "./page";

describe("AdminReservationsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders reservations table", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "res-1",
          userId: "user-1",
          resourceUnitId: "unit-1",
          startsAt: "2025-06-01T14:00:00Z",
          endsAt: "2025-06-03T11:00:00Z",
          status: "confirmed",
          totalAmount: { currency: "USD", amount: 5000 },
          source: "member_booking",
          createdAt: "2025-05-15T10:00:00Z",
        },
      ],
    });

    const ui = await AdminReservationsPage();
    render(ui);

    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await AdminReservationsPage();
    render(ui);

    expect(screen.getByText("No reservations yet.")).toBeInTheDocument();
  });

  it("renders API error", async () => {
    apiFetchMock.mockResolvedValue({
      ok: false,
      error: "Unauthorized",
    });

    const ui = await AdminReservationsPage();
    render(ui);

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });
});
