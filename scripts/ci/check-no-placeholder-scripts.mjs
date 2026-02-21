#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const packageJsonPaths = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.name === "package.json") {
      packageJsonPaths.push(fullPath);
    }
  }
}

walk(repoRoot);

const placeholderPattern =
  /\becho\s+["']?(Initialize|Implement|TODO|TBD|placeholder|Reserved)\b/i;
const violations = [];

for (const pkgPath of packageJsonPaths) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const scripts = pkg.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command === "string" && placeholderPattern.test(command)) {
      violations.push({
        file: path.relative(repoRoot, pkgPath),
        script: name,
        command
      });
    }
  }
}

if (violations.length > 0) {
  console.error("[placeholder-scripts] Found placeholder scripts:");
  for (const violation of violations) {
    console.error(
      `- ${violation.file} script='${violation.script}' command='${violation.command}'`
    );
  }
  process.exit(1);
}

console.log("[placeholder-scripts] ok");
