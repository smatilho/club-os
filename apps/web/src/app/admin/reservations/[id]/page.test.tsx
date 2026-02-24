import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock, notFoundMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("../../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import AdminReservationDetailPage from "./page";

describe("AdminReservationDetailPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    notFoundMock.mockClear();
  });

  afterEach(cleanup);

  it("renders reservation detail with actions", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        id: "res-1",
        userId: "user-1",
        resourceUnitId: "unit-1",
        holdId: null,
        startsAt: "2025-06-01T14:00:00Z",
        endsAt: "2025-06-03T11:00:00Z",
        status: "payment_pending",
        totalAmount: { currency: "USD", amount: 5000 },
        source: "member_booking",
        createdAt: "2025-05-15T10:00:00Z",
        confirmedAt: null,
        canceledAt: null,
        paymentTransactionId: null,
        version: 1,
      },
    });

    const ui = await AdminReservationDetailPage({
      params: Promise.resolve({ id: "res-1" }),
    });
    render(ui);

    expect(screen.getByText("Reservation Detail")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("payment pending")).toBeInTheDocument();
    // Actions component renders
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Override Confirm")).toBeInTheDocument();
  });

  it("calls notFound for missing reservation", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Not found" });

    await expect(
      AdminReservationDetailPage({
        params: Promise.resolve({ id: "nonexistent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
