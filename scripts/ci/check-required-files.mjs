#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const requiredFiles = [
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "docs/implementation/phase-plan.md",
  "docs/implementation/claude-execution-checklist.md",
  "docs/security/policy-engine-contract.md",
  "docs/operations/reliability-baseline.md",
  "docs/contracts/module-manifest.schema.json"
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(repoRoot, file)));

if (missing.length > 0) {
  console.error("[required-files] Missing files:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("[required-files] ok");
