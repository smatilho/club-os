import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { publicApiFetchMock, notFoundMock } = vi.hoisted(() => ({
  publicApiFetchMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("../../../lib/api-client", () => ({
  publicApiFetch: publicApiFetchMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import PublicContentPage from "./page";

describe("PublicContentPage", () => {
  beforeEach(() => {
    publicApiFetchMock.mockReset();
    notFoundMock.mockClear();
  });

  it("renders published content page", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        slug: "about/history",
        title: "Our History",
        body: "Founded in 1920",
        publishedAt: "2024-01-15T12:00:00.000Z",
      },
    });

    const ui = await PublicContentPage({
      params: Promise.resolve({ slug: ["about", "history"] }),
    });
    render(ui);

    expect(screen.getByText("Our History")).toBeInTheDocument();
    expect(screen.getByText("Founded in 1920")).toBeInTheDocument();
  });

  it("calls notFound when page is not published", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Page not found",
    });

    await expect(
      PublicContentPage({
        params: Promise.resolve({ slug: ["nonexistent"] }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("fetches correct API path from slug segments", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        slug: "about/team/leadership",
        title: "Leadership",
        body: "Meet our leaders",
        publishedAt: "2024-06-01T00:00:00.000Z",
      },
    });

    const ui = await PublicContentPage({
      params: Promise.resolve({ slug: ["about", "team", "leadership"] }),
    });
    render(ui);

    expect(publicApiFetchMock).toHaveBeenCalledWith(
      "/api/content/public/pages/about/team/leadership",
    );
  });
});
