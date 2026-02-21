#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const candidateRoots = [
  "apps/web/src",
  "services/api/src",
  "packages"
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const bannedImportPatterns = [
  /^@supabase\//,
  /^supabase$/,
  /^@vercel\//,
  /^vercel$/,
  /^@aws-sdk\//,
  /^aws-sdk$/,
  /^@google-cloud\//,
  /^firebase/,
  /^@azure\//,
  /^azure-/,
  /^stripe$/,
  /^@stripe\//
];

function findArchitectureLayer(filePath) {
  const segments = filePath.split(path.sep);
  if (segments.includes("domain")) {
    return "domain";
  }
  if (segments.includes("application")) {
    return "application";
  }
  if (segments.includes("infrastructure")) {
    return "infrastructure";
  }
  return null;
}

function shouldCheckFile(filePath) {
  const ext = path.extname(filePath);
  if (!sourceExtensions.has(ext)) {
    return false;
  }
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  if (relativePath.startsWith("packages/") && relativePath.includes("/src/")) {
    return true;
  }
  if (relativePath.startsWith("apps/web/src/")) {
    return true;
  }
  if (relativePath.startsWith("services/api/src/")) {
    return true;
  }
  return false;
}

function listSourceFiles(rootPath, result = []) {
  if (!fs.existsSync(rootPath)) {
    return result;
  }
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") {
      continue;
    }
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(fullPath, result);
      continue;
    }
    if (shouldCheckFile(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

function extractImports(sourceText) {
  const imports = [];
  const importRegex = /from\s+["']([^"']+)["']/g;
  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  const requireRegex = /require\(\s*["']([^"']+)["']\s*\)/g;

  for (const regex of [importRegex, dynamicImportRegex, requireRegex]) {
    let match = regex.exec(sourceText);
    while (match) {
      imports.push(match[1]);
      match = regex.exec(sourceText);
    }
  }

  return imports;
}

function isBannedImport(importPath) {
  if (importPath.startsWith(".") || importPath.startsWith("/")) {
    return false;
  }
  return bannedImportPatterns.some((pattern) => pattern.test(importPath));
}

const filesToCheck = candidateRoots.flatMap((root) => listSourceFiles(path.join(repoRoot, root)));
const violations = [];

for (const file of filesToCheck) {
  const content = fs.readFileSync(file, "utf8");
  const imports = extractImports(content);
  const layer = findArchitectureLayer(file);
  for (const value of imports) {
    if (isBannedImport(value) && layer !== "infrastructure") {
      violations.push({
        file: path.relative(repoRoot, file),
        importValue: value,
        layer: layer ?? "unscoped"
      });
    }
  }
}

if (violations.length > 0) {
  console.error(
    "[boundary-imports] Provider SDK imports are only allowed in infrastructure paths."
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file} (${violation.layer}) imports '${violation.importValue}'`
    );
  }
  process.exit(1);
}

console.log("[boundary-imports] ok");
