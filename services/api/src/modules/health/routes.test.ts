import { describe, it, expect } from "vitest";
import app from "../../index";

describe("health endpoint", () => {
  it("returns ok status", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
