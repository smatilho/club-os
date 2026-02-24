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

import ReservationDetailPage from "./page";

describe("ReservationDetailPage (member)", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    notFoundMock.mockClear();
  });

  afterEach(cleanup);

  it("renders reservation detail", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        id: "res-1",
        resourceUnitId: "unit-1",
        holdId: null,
        startsAt: "2025-06-01T14:00:00Z",
        endsAt: "2025-06-03T11:00:00Z",
        status: "confirmed",
        totalAmount: { currency: "USD", amount: 5000 },
        source: "member_booking",
        createdAt: "2025-05-15T10:00:00Z",
        confirmedAt: "2025-05-15T10:01:00Z",
        canceledAt: null,
        paymentTransactionId: null,
        version: 2,
      },
    });

    const ui = await ReservationDetailPage({
      params: Promise.resolve({ id: "res-1" }),
    });
    render(ui);

    expect(screen.getByText("Reservation")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
    expect(screen.getByText("res-1")).toBeInTheDocument();
  });

  it("calls notFound for missing reservation", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Not found" });

    await expect(
      ReservationDetailPage({
        params: Promise.resolve({ id: "nonexistent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
