import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { publicApiFetchMock } = vi.hoisted(() => ({
  publicApiFetchMock: vi.fn(),
}));

vi.mock("../../lib/api-client", () => ({
  publicApiFetch: publicApiFetchMock,
}));

import PublicLayout from "./layout";

describe("PublicLayout", () => {
  beforeEach(() => {
    publicApiFetchMock.mockReset();
  });

  it("renders brand name from theme", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        brandName: "Test Club",
        logoUrl: null,
        primaryColor: "#112233",
        accentColor: "#445566",
        surfaceColor: "#ffffff",
        textColor: "#000000",
      },
    });

    const ui = await PublicLayout({
      children: <div>Child Content</div>,
    });
    render(ui);

    expect(screen.getByText("Test Club")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("applies CSS variables from theme", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        brandName: "Styled Club",
        logoUrl: null,
        primaryColor: "#aabbcc",
        accentColor: "#ddeeff",
        surfaceColor: "#f0f0f0",
        textColor: "#111111",
      },
    });

    const ui = await PublicLayout({
      children: <div>Content</div>,
    });
    const { container } = render(ui);
    const layoutDiv = container.querySelector("[data-testid='public-layout']");
    expect(layoutDiv).toBeTruthy();
    const style = (layoutDiv as HTMLElement).style;
    expect(style.getPropertyValue("--brand-primary")).toBe("#aabbcc");
    expect(style.getPropertyValue("--brand-accent")).toBe("#ddeeff");
    expect(style.getPropertyValue("--brand-surface")).toBe("#f0f0f0");
    expect(style.getPropertyValue("--brand-text")).toBe("#111111");
  });

  it("falls back to default theme when API is unavailable", async () => {
    publicApiFetchMock.mockRejectedValue(new Error("Network error"));

    const ui = await PublicLayout({
      children: <div>Fallback Content</div>,
    });
    render(ui);

    expect(screen.getByText("Club OS")).toBeInTheDocument();
    expect(screen.getByText("Fallback Content")).toBeInTheDocument();
  });

  it("renders logo when logoUrl is provided", async () => {
    publicApiFetchMock.mockResolvedValue({
      ok: true,
      data: {
        brandName: "Logo Club",
        logoUrl: "https://example.com/logo.png",
        primaryColor: "#112233",
        accentColor: "#445566",
        surfaceColor: "#ffffff",
        textColor: "#000000",
      },
    });

    const ui = await PublicLayout({
      children: <div>Content</div>,
    });
    render(ui);

    const logo = screen.getByAltText("Logo Club logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
  });
});
