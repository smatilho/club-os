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

function mockTheme(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      brandName: "Test Club",
      logoUrl: null,
      primaryColor: "#112233",
      accentColor: "#445566",
      surfaceColor: "#ffffff",
      textColor: "#000000",
      ...overrides,
    },
  };
}

function mockNav(items: unknown[] = []) {
  return { ok: true, data: items };
}

describe("PublicLayout", () => {
  beforeEach(() => {
    publicApiFetchMock.mockReset();
    // Default: theme returns fallback-like, nav returns empty
    publicApiFetchMock.mockImplementation((path: string) => {
      if (path.includes("/api/navigation/")) return Promise.resolve(mockNav());
      return Promise.resolve(mockTheme());
    });
  });

  it("renders brand name from theme", async () => {
    publicApiFetchMock.mockImplementation((path: string) => {
      if (path.includes("/api/navigation/")) return Promise.resolve(mockNav());
      return Promise.resolve(mockTheme({ brandName: "Test Club" }));
    });

    const ui = await PublicLayout({
      children: <div>Child Content</div>,
    });
    render(ui);

    // Brand name appears in both header and footer
    const matches = screen.getAllByText("Test Club");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("applies CSS variables from theme", async () => {
    publicApiFetchMock.mockImplementation((path: string) => {
      if (path.includes("/api/navigation/")) return Promise.resolve(mockNav());
      return Promise.resolve(
        mockTheme({
          brandName: "Styled Club",
          primaryColor: "#aabbcc",
          accentColor: "#ddeeff",
          surfaceColor: "#f0f0f0",
          textColor: "#111111",
        }),
      );
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

    // "Club OS" appears in header and footer; check at least one exists
    const matches = screen.getAllByText("Club OS");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fallback Content")).toBeInTheDocument();
  });

  it("renders logo when logoUrl is provided", async () => {
    publicApiFetchMock.mockImplementation((path: string) => {
      if (path.includes("/api/navigation/")) return Promise.resolve(mockNav());
      return Promise.resolve(
        mockTheme({
          brandName: "Logo Club",
          logoUrl: "https://example.com/logo.png",
        }),
      );
    });

    const ui = await PublicLayout({
      children: <div>Content</div>,
    });
    render(ui);

    const logo = screen.getByAltText("Logo Club logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("renders header nav items from API", async () => {
    publicApiFetchMock.mockImplementation((path: string) => {
      if (path.includes("public_header"))
        return Promise.resolve(
          mockNav([
            {
              id: "1",
              label: "About",
              linkTarget: "/public/about",
              parentId: null,
              sortOrder: 0,
            },
          ]),
        );
      if (path.includes("/api/navigation/")) return Promise.resolve(mockNav());
      return Promise.resolve(mockTheme());
    });

    const ui = await PublicLayout({
      children: <div>Content</div>,
    });
    render(ui);

    expect(screen.getByText("About")).toBeInTheDocument();
  });
});
