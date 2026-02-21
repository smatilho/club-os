import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

test("README documents unified route areas", () => {
  const readme = read("README.md");
  assert.match(readme, /\/public\/\*/);
  assert.match(readme, /\/member\/\*/);
  assert.match(readme, /\/admin\/\*/);
});

test("phase plan includes single web app foundation work", () => {
  const phasePlan = read("docs/implementation/phase-plan.md");
  assert.match(phasePlan, /Initialize one Next\.js web app/);
});
