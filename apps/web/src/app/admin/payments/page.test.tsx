import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

import AdminPaymentsPage from "./page";

describe("AdminPaymentsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders payment transactions table", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "txn-1",
          reservationId: "res-1",
          organizationId: "org-1",
          userId: "user-1",
          amount: { currency: "USD", amount: 5000 },
          status: "succeeded",
          providerTransactionId: "fake_txn_abc",
          createdAt: "2025-05-15T10:00:00Z",
        },
      ],
    });

    const ui = await AdminPaymentsPage();
    render(ui);

    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("succeeded")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await AdminPaymentsPage();
    render(ui);

    expect(screen.getByText("No payment transactions yet.")).toBeInTheDocument();
  });

  it("renders error state", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Forbidden" });

    const ui = await AdminPaymentsPage();
    render(ui);

    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });
});
