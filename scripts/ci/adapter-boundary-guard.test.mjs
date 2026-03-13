import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const guardPath = path.join(
  repoRoot,
  "scripts/arch/check-adapter-boundaries.mjs",
);
const guardSource = fs.readFileSync(guardPath, "utf8");

test("adapter boundary guard scans web/api/packages sources", () => {
  assert.match(guardSource, /"apps\/web\/src"/);
  assert.match(guardSource, /"services\/api\/src"/);
  assert.match(guardSource, /"packages"/);
});

test("adapter boundary guard blocks provider imports outside adapter zones", () => {
  assert.match(guardSource, /provider-sdk-import-outside-adapter/);
  assert.match(guardSource, /isProviderImport/);
});

test("adapter boundary guard blocks imports from adapter files in non-adapter code", () => {
  assert.match(guardSource, /adapter-import-leakage/);
  assert.match(guardSource, /resolveRelativeImport/);
});
