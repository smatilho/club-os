import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AdminReservationActions } from "./actions";

describe("AdminReservationActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(cleanup);

  it("shows override confirm when status is payment_pending", () => {
    render(
      <AdminReservationActions
        reservationId="res-1"
        status="payment_pending"
        paymentTransactionId={null}
      />,
    );

    expect(screen.getByText("Override Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel Reservation")).toBeInTheDocument();
    expect(screen.queryByText("Refund Payment")).not.toBeInTheDocument();
  });

  it("shows refund when payment exists and status is confirmed", () => {
    render(
      <AdminReservationActions
        reservationId="res-1"
        status="confirmed"
        paymentTransactionId="txn-1"
      />,
    );

    expect(screen.queryByText("Override Confirm")).not.toBeInTheDocument();
    expect(screen.getByText("Cancel Reservation")).toBeInTheDocument();
    expect(screen.getByText("Refund Payment")).toBeInTheDocument();
  });

  it("hides cancel when already canceled", () => {
    render(
      <AdminReservationActions
        reservationId="res-1"
        status="canceled"
        paymentTransactionId={null}
      />,
    );

    expect(screen.queryByText("Cancel Reservation")).not.toBeInTheDocument();
  });

  it("requires reason for cancel", () => {
    render(
      <AdminReservationActions
        reservationId="res-1"
        status="confirmed"
        paymentTransactionId={null}
      />,
    );

    fireEvent.click(screen.getByText("Cancel Reservation"));
    expect(screen.getByText("Please provide a reason for cancellation.")).toBeInTheDocument();
  });

  it("calls override confirm API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminReservationActions
        reservationId="res-1"
        status="payment_pending"
        paymentTransactionId={null}
      />,
    );

    fireEvent.click(screen.getByText("Override Confirm"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cms/admin/reservations/res-1/override-confirm",
      { method: "POST" },
    );
  });
});
