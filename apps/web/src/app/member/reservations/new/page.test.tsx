import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import NewBookingPage from "./page";

describe("NewBookingPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(cleanup);

  it("renders date selection step initially", () => {
    render(<NewBookingPage />);

    expect(screen.getByText("Book a Reservation")).toBeInTheDocument();
    expect(screen.getByText("1. Choose Dates")).toBeInTheDocument();
    expect(screen.getByText("Check Availability")).toBeInTheDocument();
  });

  it("shows error when checking availability without dates", () => {
    render(<NewBookingPage />);

    fireEvent.click(screen.getByText("Check Availability"));
    expect(screen.getByText("Please select both start and end dates")).toBeInTheDocument();
  });

  it("fetches availability and shows resource selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              resourceUnitId: "unit-1",
              code: "A1",
              name: "Cabin Alpha",
              kind: "cabin",
              available: true,
              blockingReason: null,
            },
            {
              resourceUnitId: "unit-2",
              code: "A2",
              name: "Cabin Bravo",
              kind: "cabin",
              available: false,
              blockingReason: "confirmed_reservation",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<NewBookingPage />);

    // datetime-local inputs aren't matched by role="textbox"
    const dateInputs = container.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dateInputs[0]!, { target: { value: "2025-06-01T14:00" } });
    fireEvent.change(dateInputs[1]!, { target: { value: "2025-06-03T11:00" } });

    fireEvent.click(screen.getByText("Check Availability"));

    // Wait for availability results
    await waitFor(() => {
      expect(screen.getByText("2. Select a Unit")).toBeInTheDocument();
    });
    expect(screen.getByText("Cabin Alpha")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Reserved")).toBeInTheDocument();
  });

  it("creates a hold when selecting an available unit", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                resourceUnitId: "unit-1",
                code: "A1",
                name: "Cabin Alpha",
                kind: "cabin",
                available: true,
                blockingReason: null,
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: "hold-1", status: "held" },
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<NewBookingPage />);
    const dateInputs = container.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dateInputs[0]!, { target: { value: "2025-06-01T14:00" } });
    fireEvent.change(dateInputs[1]!, { target: { value: "2025-06-03T11:00" } });
    fireEvent.click(screen.getByText("Check Availability"));

    await waitFor(() => {
      expect(screen.getByText("2. Select a Unit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cabin Alpha"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cms/reservations/holds",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(screen.getByText("3. Confirm & Pay")).toBeInTheDocument();
  });
});
