import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const guardPath = path.join(repoRoot, "scripts/arch/check-boundary-imports.mjs");
const guardSource = fs.readFileSync(guardPath, "utf8");

test("boundary guard scans full app/service/package source roots", () => {
  assert.match(guardSource, /"apps\/web\/src"/);
  assert.match(guardSource, /"services\/api\/src"/);
  assert.match(guardSource, /"packages"/);
});

test("boundary guard allows provider SDK imports only in infrastructure", () => {
  assert.match(guardSource, /layer !== "infrastructure"/);
  assert.match(guardSource, /layer: layer \?\? "unscoped"/);
});
