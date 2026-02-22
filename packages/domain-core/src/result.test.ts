import { describe, it, expect } from "vitest";
import { ok, err } from "./result";

describe("Result", () => {
  it("creates ok result", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("creates err result", () => {
    const result = err(new Error("fail"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("fail");
    }
  });
});
