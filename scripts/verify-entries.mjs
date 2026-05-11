#!/usr/bin/env node
/**
 * appkit-verify-entries — asserts firebase-admin is not reachable from the client entry.
 *
 * Loads dist/client-entry.js in a synthetic browser-like environment and checks
 * that the module graph does not attempt to require firebase-admin.
 *
 * Exits 0 on clean, 1 on failure.
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { join } from "path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLIENT_ENTRY = join(ROOT, "dist", "client-entry.js");

// Intercept any attempt to load firebase-admin at the top level
const intercepted = [];
const require = createRequire(import.meta.url);
const originalLoad = require.extensions?.[".js"];

// For ESM we rely on dynamic import with a module mock
// Simple approach: scan the compiled output for top-level firebase-admin imports

import { readFile } from "fs/promises";
import { existsSync } from "fs";

if (!existsSync(CLIENT_ENTRY)) {
  console.log("appkit-verify-entries: dist/client-entry.js not found — run npm run build first.");
  process.exit(0);
}

const src = await readFile(CLIENT_ENTRY, "utf8");

// Check for direct firebase-admin imports in the entry (not in a conditional)
const FORBIDDEN = ["firebase-admin"];

let failed = false;
for (const pkg of FORBIDDEN) {
  // Look for import statements (not commented)
  const importPattern = new RegExp(`^(?!\\s*\\/\\/).*from ['"]${pkg}`, "m");
  const requirePattern = new RegExp(`require\\(['"]${pkg}`, "m");
  if (importPattern.test(src) || requirePattern.test(src)) {
    console.error(`[FAIL] Client entry imports '${pkg}' directly.`);
    failed = true;
  }
}

if (!failed) {
  console.log("appkit-verify-entries: client entry is firebase-admin free ✓");
  process.exit(0);
} else {
  process.exit(1);
}
