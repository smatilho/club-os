import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const schemaPath = path.join(repoRoot, "docs/contracts/module-manifest.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

test("manifest schema requires schemaVersion and semver module version", () => {
  assert.ok(schema.required.includes("schemaVersion"));
  assert.match(schema.properties.version.pattern, /0\|\[1-9]/);
});

test("manifest schema uses unified web app route key", () => {
  const routeAppEnum = schema.properties.routes.items.properties.app.enum;
  assert.ok(routeAppEnum.includes("web"));
  assert.ok(!routeAppEnum.includes("public-web"));
  assert.ok(!routeAppEnum.includes("member-web"));
  assert.ok(!routeAppEnum.includes("admin-web"));
});

test("manifest schema enforces capability namespace pattern", () => {
  const pattern = schema.properties.capabilities.items.pattern;
  assert.match(pattern, /\\\./);
});

test("manifest route path pattern allows dynamic and parameterized segments", () => {
  const pattern = new RegExp(schema.properties.routes.items.properties.path.pattern);
  assert.ok(pattern.test("/member/bookings/[id]"));
  assert.ok(pattern.test("/api/reservations/:id"));
});
