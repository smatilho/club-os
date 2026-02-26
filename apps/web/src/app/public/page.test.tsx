import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { publicApiFetchMock } = vi.hoisted(() => ({
  publicApiFetchMock: vi.fn(),
}));

vi.mock("../../lib/api-client", () => ({
  publicApiFetch: publicApiFetchMock,
}));

import PublicHome from "./page";

describe("PublicHome", () => {
  beforeEach(() => {
    publicApiFetchMock.mockReset();
  });

  it("renders CMS homepage when available", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        slug: "home",
        title: "Welcome Home",
        body: "This is our homepage content.",
        publishedAt: "2024-01-15T12:00:00.000Z",
        contentFormat: "legacy_markdown",
      },
    });

    const ui = await PublicHome();
    render(ui);

    expect(screen.getByText("Welcome Home")).toBeInTheDocument();
    expect(screen.getByText("This is our homepage content.")).toBeInTheDocument();
  });

  it("renders onboarding fallback when no homepage exists", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Page not found",
    });

    const ui = await PublicHome();
    render(ui);

    expect(screen.getByText("Welcome to Club OS")).toBeInTheDocument();
    expect(screen.getByText(/Your site is ready to set up/)).toBeInTheDocument();
    expect(screen.getByText("Go to Admin Dashboard")).toBeInTheDocument();
  });

  it("fetches the home slug from CMS API", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      error: "Page not found",
    });

    await PublicHome();

    expect(publicApiFetchMock).toHaveBeenCalledWith(
      "/api/content/public/pages/home",
    );
  });
});
