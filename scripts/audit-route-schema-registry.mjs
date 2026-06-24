#!/usr/bin/env node
/**
 * audit-route-schema-registry
 *
 * Cross-checks `src/app/api/**\/route.ts` files against `SCHEMAS.api`
 * in appkit/src/schemas/registry.ts.
 *
 * For each route file, the audit derives the HTTP-verb-and-path key
 * (e.g. "POST /api/wishlist", "PATCH /api/store/orders/[id]") from the
 * filesystem layout and the exported HTTP handler functions.
 *
 *   src/app/api/wishlist/route.ts        + `export const POST = ...`
 *     → "POST /api/wishlist"
 *
 *   src/app/api/store/orders/[id]/route.ts + `export const PATCH = ...`
 *     → "PATCH /api/store/orders/[id]"
 *
 * Each key must either:
 *   (a) Be registered in SCHEMAS.api (parsed from registry.ts), OR
 *   (b) Have the `// audit-route-schema-ok: <reason>` marker above
 *       the matching `export const VERB = ...` line, OR
 *   (c) Be a route that legitimately accepts no body / search params
 *       (GET with no query — rare; mark with the suppression marker).
 *
 * Currently REPORT MODE — exits 0 with a stderr summary of missing
 * routes. W8 wires it strict via MIGRATE=strict.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");
const CONSUMER_API = join(REPO_ROOT, "src", "app", "api");
const REGISTRY = join(REPO_ROOT, "appkit", "src", "schemas", "registry.ts");

// Opt-in strict: only fail when MIGRATE=strict is set. Unregistered routes warn.
const STRICT = process.env.MIGRATE === "strict";
const VERBS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

// ---------------------------------------------------------------------------
// Parse the registry's `const api = { ... } as const;` block to extract
// the registered keys.
// ---------------------------------------------------------------------------
function loadRegisteredKeys() {
  if (!existsSync(REGISTRY)) return new Set();
  const src = readFileSync(REGISTRY, "utf8");
  const m = src.match(/const\s+api\s*=\s*\{([\s\S]*?)\}\s*as\s+const\s*;/);
  if (!m) return new Set();
  const keys = new Set();
  const keyRe = /["']([A-Z]+\s+[^"']+)["']\s*:/g;
  let km;
  while ((km = keyRe.exec(m[1])) !== null) keys.add(km[1]);
  return keys;
}

// ---------------------------------------------------------------------------
// Walk src/app/api/** for route.ts files.
// ---------------------------------------------------------------------------
function* walkApi(root) {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "__tests__") continue;
    const full = join(root, e.name);
    if (e.isDirectory()) yield* walkApi(full);
    else if (e.isFile() && e.name === "route.ts") yield full;
  }
}

function fileToApiPath(file) {
  // src/app/api/wishlist/route.ts → /api/wishlist
  // src/app/api/store/orders/[id]/route.ts → /api/store/orders/[id]
  const rel = relative(join(REPO_ROOT, "src", "app"), dirname(file)).replace(/\\/g, "/");
  return `/${rel}`;
}

const SUPPRESSION = /\/\/\s*audit-route-schema-ok\s*:/i;

const registered = loadRegisteredKeys();
const missing = [];
let totalVerbs = 0;

for (const file of walkApi(CONSUMER_API)) {
  const src = readFileSync(file, "utf8");
  const apiPath = fileToApiPath(file);
  const lines = src.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match `export const VERB = createRouteHandler({...` or async function
    const m = line.match(/export\s+(?:const|async\s+function)\s+([A-Z]+)\b/);
    if (!m) continue;
    const verb = m[1];
    if (!VERBS.includes(verb)) continue;
    totalVerbs++;

    // Suppression marker on this line OR any contiguous comment line above.
    if (SUPPRESSION.test(line)) continue;
    let suppressed = false;
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j];
      if (SUPPRESSION.test(prev)) { suppressed = true; break; }
      if (!/^\s*\/\//.test(prev)) break; // stop at first non-comment line
    }
    if (suppressed) continue;

    const key = `${verb} ${apiPath}`;
    if (!registered.has(key)) {
      missing.push({ key, file: relative(REPO_ROOT, file), line: i + 1 });
    }
  }
}

const MISSING = missing.length;

if (STRICT && MISSING > 0) {
  console.error(`audit-route-schema-registry: ${MISSING}/${totalVerbs} routes not registered in SCHEMAS.api.`);
  for (const v of missing.slice(0, 50)) {
    console.error(`  • ${v.key}  (${v.file}:${v.line})`);
  }
  if (missing.length > 50) console.error(`  … and ${missing.length - 50} more.`);
  process.exit(1);
}

if (MISSING > 0) {
  console.warn(`audit-route-schema-registry: REPORT MODE — ${MISSING}/${totalVerbs} routes await SCHEMAS.api registration.`);
  console.warn(`  Run with MIGRATE=strict to fail. Wired into npm run check at W8.`);
  console.warn(`  Currently registered: ${registered.size} routes.`);
  console.warn(`  Sample missing (first 10):`);
  for (const v of missing.slice(0, 10)) {
    console.warn(`    • ${v.key}`);
  }
} else {
  console.log(`audit-route-schema-registry: OK (all ${totalVerbs} routes registered).`);
}

process.exit(0);
