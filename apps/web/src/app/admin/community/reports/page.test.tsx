import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../../../../lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("./status-filter", () => ({
  ReportStatusFilter: () => <div data-testid="status-filter">Filter</div>,
}));

import AdminReportsPage from "./page";

describe("AdminReportsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(cleanup);

  it("renders reports table", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "r1",
          targetType: "post",
          targetId: "post-12345678-abcd",
          reasonCode: "spam",
          status: "open",
          reportedByUserId: "reporter-1234",
          resolutionNotes: null,
          resolvedByUserId: null,
          createdAt: "2025-06-01T10:00:00Z",
        },
      ],
    });

    const ui = await AdminReportsPage();
    render(ui);

    expect(screen.getByText("Community Reports")).toBeInTheDocument();
    expect(screen.getByText("spam")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    const ui = await AdminReportsPage();
    render(ui);

    expect(screen.getByText("No reports.")).toBeInTheDocument();
  });

  it("renders error", async () => {
    apiFetchMock.mockResolvedValue({ ok: false, error: "Forbidden" });

    const ui = await AdminReportsPage();
    render(ui);

    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });
});
