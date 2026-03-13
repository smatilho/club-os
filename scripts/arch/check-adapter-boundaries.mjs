#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const candidateRoots = ["apps/web/src", "services/api/src", "packages"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

const bannedProviderImportPatterns = [
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

function toUnixPath(value) {
  return value.split(path.sep).join("/");
}

function isSourceFile(filePath) {
  const ext = path.extname(filePath);
  if (!sourceExtensions.has(ext)) return false;
  const relativePath = toUnixPath(path.relative(repoRoot, filePath));
  if (relativePath.startsWith("packages/") && relativePath.includes("/src/")) return true;
  if (relativePath.startsWith("apps/web/src/")) return true;
  if (relativePath.startsWith("services/api/src/")) return true;
  return false;
}

function listSourceFiles(rootPath, result = []) {
  if (!fs.existsSync(rootPath)) return result;
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
    if (isSourceFile(fullPath)) result.push(fullPath);
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

function isAdapterOrInfrastructurePath(filePath) {
  const relativePath = toUnixPath(path.relative(repoRoot, filePath));
  return (
    relativePath.includes("/infrastructure/") ||
    relativePath.startsWith("services/api/src/adapters/")
  );
}

function resolveRelativeImport(importerFile, importValue) {
  const importerDir = path.dirname(importerFile);
  const resolvedBase = path.resolve(importerDir, importValue);
  const attempts = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}.js`,
    `${resolvedBase}.mjs`,
    `${resolvedBase}.cjs`,
    path.join(resolvedBase, "index.ts"),
    path.join(resolvedBase, "index.tsx"),
    path.join(resolvedBase, "index.js"),
    path.join(resolvedBase, "index.mjs"),
    path.join(resolvedBase, "index.cjs")
  ];
  for (const attempt of attempts) {
    if (fs.existsSync(attempt) && fs.statSync(attempt).isFile()) {
      return attempt;
    }
  }
  return null;
}

function isProviderImport(importValue) {
  if (importValue.startsWith(".") || importValue.startsWith("/")) return false;
  return bannedProviderImportPatterns.some((pattern) => pattern.test(importValue));
}

const filesToCheck = candidateRoots.flatMap((root) =>
  listSourceFiles(path.join(repoRoot, root))
);

const violations = [];

for (const file of filesToCheck) {
  const fileSource = fs.readFileSync(file, "utf8");
  const imports = extractImports(fileSource);
  const importerIsAdapter = isAdapterOrInfrastructurePath(file);

  for (const importValue of imports) {
    if (isProviderImport(importValue) && !importerIsAdapter) {
      violations.push({
        file: toUnixPath(path.relative(repoRoot, file)),
        type: "provider-sdk-import-outside-adapter",
        importValue
      });
      continue;
    }

    if (importerIsAdapter) continue;

    if (importValue.startsWith(".") || importValue.startsWith("/")) {
      const resolved = resolveRelativeImport(file, importValue);
      if (resolved && isAdapterOrInfrastructurePath(resolved)) {
        violations.push({
          file: toUnixPath(path.relative(repoRoot, file)),
          type: "adapter-import-leakage",
          importValue
        });
      }
      continue;
    }

    if (importValue.includes("/adapters/") || importValue.includes("/infrastructure/")) {
      violations.push({
        file: toUnixPath(path.relative(repoRoot, file)),
        type: "adapter-import-leakage",
        importValue
      });
    }
  }
}

if (violations.length > 0) {
  console.error(
    "[adapter-boundaries] Provider SDK imports and adapter code must remain isolated."
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file} [${violation.type}] imports '${violation.importValue}'`
    );
  }
  process.exit(1);
}

console.log("[adapter-boundaries] ok");
