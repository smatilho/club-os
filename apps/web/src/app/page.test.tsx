import { describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import RootPage from "./page";

describe("RootPage", () => {
  it("redirects to /public", () => {
    expect(() => RootPage()).toThrow("NEXT_REDIRECT:/public");
    expect(redirectMock).toHaveBeenCalledWith("/public");
  });
});
