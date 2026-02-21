#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const [, , task = "task", expectedName = ""] = process.argv;
const cwd = process.cwd();
const pkgPath = path.join(cwd, "package.json");
const srcPath = path.join(cwd, "src");
const readmePath = path.join(cwd, "README.md");
const relCwd = path.relative(process.cwd(), cwd);

if (!fs.existsSync(pkgPath)) {
  console.error(`[scaffold-check] Missing package.json at ${relCwd || "."}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
if (expectedName && pkg.name !== expectedName) {
  console.error(
    `[scaffold-check] Package name mismatch. expected='${expectedName}' actual='${pkg.name}'`
  );
  process.exit(1);
}

if (!fs.existsSync(srcPath)) {
  console.error(`[scaffold-check] Missing src directory for ${pkg.name}`);
  process.exit(1);
}

if ((cwd.includes(`${path.sep}apps${path.sep}`) || cwd.includes(`${path.sep}services${path.sep}`)) && !fs.existsSync(readmePath)) {
  console.error(`[scaffold-check] Missing README.md for ${pkg.name}`);
  process.exit(1);
}

if (!pkg.version) {
  console.error(`[scaffold-check] Missing version field for ${pkg.name}`);
  process.exit(1);
}

console.log(`[scaffold-check] ${pkg.name} ${task}: ok`);
