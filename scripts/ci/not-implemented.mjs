#!/usr/bin/env node

const [, , task = "task", target = "workspace"] = process.argv;

console.error(
  `[${target}] '${task}' is intentionally blocked in blueprint stage.\n` +
    "Follow /docs/implementation/claude-execution-checklist.md Phase 0 to bootstrap runnable app and service builds."
);
process.exit(1);
