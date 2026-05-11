#!/usr/bin/env node
/**
 * appkit-smoke-ssr — SSR route smoke tests.
 *
 * Reads appkit.config.ts from the consumer's cwd, fetches each route in
 * routes.smoke, and asserts that the expected strings appear in the initial
 * HTML (no JavaScript evaluation — raw HTTP response only).
 *
 * Exits 0 if all checks pass, 1 if any fail.
 *
 * Usage: npx appkit-smoke-ssr
 * Or:    npx appkit-smoke-ssr --base http://localhost:3000
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const CWD = process.cwd();
const CONFIG_PATHS = [
  join(CWD, "appkit.config.js"),
  join(CWD, "appkit.config.mjs"),
];

let config = null;
for (const p of CONFIG_PATHS) {
  if (existsSync(p)) {
    const mod = await import(pathToFileURL(p).href);
    config = mod.default ?? mod;
    break;
  }
}

if (!config) {
  console.error("appkit-smoke-ssr: no appkit.config.js found in cwd. Run npx appkit-init-config first.");
  process.exit(1);
}

const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : (config.baseUrl ?? "http://localhost:3000");

const routes = config.routes?.smoke ?? [];
if (routes.length === 0) {
  console.log("appkit-smoke-ssr: no smoke routes configured. Add routes.smoke to appkit.config.js");
  process.exit(0);
}

let passed = 0;
let failed = 0;

for (const route of routes) {
  const url = `${base}${route.path}`;
  try {
    const headers = {};
    if (route.auth && config.authFixtures?.[route.auth]) {
      headers["Cookie"] = config.authFixtures[route.auth].cookie;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`[FAIL] ${url} — HTTP ${res.status}`);
      failed++;
      continue;
    }
    const html = await res.text();
    const missing = route.expect.filter((s) => !html.includes(s));
    if (missing.length > 0) {
      console.error(`[FAIL] ${url} — missing in initial HTML: ${missing.join(", ")}`);
      failed++;
    } else {
      console.log(`[PASS] ${url}`);
      passed++;
    }
  } catch (err) {
    console.error(`[FAIL] ${url} — ${err.message}`);
    failed++;
  }
}

console.log(`\nappkit-smoke-ssr: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
