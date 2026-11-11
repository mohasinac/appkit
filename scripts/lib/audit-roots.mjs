/**
 * WHERE THE AUDITS LOOK — one answer, for every audit script.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11, marked P1: *"update the audit scripts to work on all
 * subdomains"*.
 *
 * Measured the same day across the 30 `audit-*.mjs` scripts:
 *
 * | what it scanned | how many |
 * |---|---|
 * | `appkit/src` only (`join(__dirname, "..", "src")`) | the large majority |
 * | `appkit/src` + the shop's `src` | 1 (`audit-catch-normalize`) |
 * | whatever `process.argv` names | 1 |
 *
 * **Not one of them scanned a subdomain app.** So every rule the suite
 * enforces — no `firebase-admin` in client code, no `_internal/server` import
 * from shared, no hardcoded brand, `catch` without `normalizeError` — was
 * enforced on appkit and on the shop, and silently unenforced across
 * `auth`, `blogs`, `events`, `bookkeeping` and `media`. Those five are where
 * the route handlers, providers and admin surfaces actually live now.
 *
 * ## 🛑 Apps are DISCOVERED, never listed
 *
 * The app roots are found by looking for `appkit/<name>/src` beside a
 * `package.json`. A sixth subdomain is then covered the day it is created,
 * with no edit here — the same reason the capability registry is data and not
 * a switch. A hardcoded array is exactly how the five got missed.
 *
 * ⚠ `media` has almost no UI and `bookkeeping` is small; they are included
 * anyway. "This app is too small to audit" is how an unaudited surface starts.
 */

import { readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
/** `appkit/scripts/lib` → `appkit` → the repo root. */
export const APPKIT_ROOT = join(SCRIPT_DIR, "..", "..");
export const REPO_ROOT = join(APPKIT_ROOT, "..");

/** Directories no audit should ever walk into. */
export const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  ".next",
  "out",
  "build",
  "coverage",
  "__tests__",
  "__mocks__",
  ".git",
  ".vercel",
]);

/**
 * Every subdomain app that has source to audit, discovered rather than listed.
 *
 * @returns `[{ name, root, src }]`
 */
export function discoverApps() {
  const apps = [];
  let entries;
  try {
    entries = readdirSync(APPKIT_ROOT, { withFileTypes: true });
  } catch {
    return apps;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue;
    const root = join(APPKIT_ROOT, entry.name);
    const src = join(root, "src");
    /*
     * A package.json AND a src/ — so `scripts/`, `dist/` and stray folders are
     * not mistaken for apps, and a directory that merely looks app-shaped is
     * not audited into a pile of false positives.
     */
    if (!existsSync(join(root, "package.json")) || !existsSync(src)) continue;
    try {
      if (!statSync(src).isDirectory()) continue;
    } catch {
      continue;
    }
    apps.push({ name: entry.name, root, src });
  }
  return apps;
}

/**
 * Every source root the audits should cover: appkit, the shop, and each app.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.includeAppkit=true]
 * @param {boolean} [opts.includeShop=true]
 * @param {boolean} [opts.includeApps=true]
 * @returns `[{ name, src }]` — `name` is what a report should print.
 */
export function auditRoots(opts = {}) {
  const {
    includeAppkit = true,
    includeShop = true,
    includeApps = true,
  } = opts;
  const roots = [];
  if (includeAppkit) roots.push({ name: "appkit", src: join(APPKIT_ROOT, "src") });
  if (includeShop) {
    const shopSrc = join(REPO_ROOT, "src");
    if (existsSync(shopSrc)) roots.push({ name: "shop", src: shopSrc });
  }
  if (includeApps) {
    for (const app of discoverApps()) roots.push({ name: app.name, src: app.src });
  }
  return roots.filter((r) => existsSync(r.src));
}

/**
 * Walk one root, yielding source files.
 *
 * @param {string} root
 * @param {RegExp} [match] Defaults to `.ts`/`.tsx`, excluding declarations.
 */
export function* walkSource(root, match = /\.(ts|tsx)$/) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* walkSource(full, match);
    else if (match.test(entry.name) && !entry.name.endsWith(".d.ts")) yield full;
  }
}

/** Every source file across every audited root, with the root it came from. */
export function* allSourceFiles(opts = {}) {
  for (const root of auditRoots(opts)) {
    for (const file of walkSource(root.src)) yield { file, root: root.name };
  }
}
