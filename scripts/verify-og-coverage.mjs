#!/usr/bin/env node
/**
 * appkit-verify-og-coverage — every public dynamic detail page should ship an
 * `opengraph-image.tsx` sibling. Walks the consumer's `src/app/[locale]/**`
 * and checks each `[slug]` / `[id]` / `[storeSlug]` leaf for OG coverage.
 *
 * Run from the letitrip.in root via `npm run check:audits` or
 * `node appkit/scripts/verify-og-coverage.mjs`.
 *
 * Exit codes:
 *   0  clean (every detail page has an OG sibling)
 *   1  missing OG images (one line per gap on stdout)
 *
 * S6 OG5 — wired into the Stop-hook audit set so any new public detail
 * route that lands without an OG image regresses the gate at commit time.
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "..", "src", "app", "[locale]");

// Routes that are intentionally non-public (admin / authenticated user area /
// utility surfaces) — listed by the first-after-[locale] segment.
const NON_PUBLIC_TOP_LEVELS = new Set([
  "admin",
  "store",
  "user",
  "dev",
  "auth",
  "checkout",
  "cart",
  "wishlist",
  "search",
  "demo",
  "settings",
  "promotions",
  "social",
]);

// Dynamic-segment routes whose only purpose is param-driven server logic
// (pagination wrappers re-rendering parent listings, auth-only preview
// surfaces, etc.). Add here when a legitimately public route is
// intentionally OG-less.
const OG_EXEMPT_ROUTES = new Set([
  // Pagination wrappers — OG belongs on the canonical listing/detail.
  "categories/sort/[sortKey]/page/[page]",
  "categories/[slug]/[tab]/sort/[sortKey]/page/[page]",
  "stores/[storeSlug]/[tab]/sort/[sortKey]/page/[page]",
  "profile/[userId]/[tab]",
  // Authenticated preview surface (token-gated).
  "preview/[token]",
]);

// Known gaps awaiting follow-up tracker entries. Listed here so the gate
// only blocks on NEW regressions; existing gaps count toward the baseline.
const OG_KNOWN_GAPS = new Set([
  // SB-UNI-4 2026-05-13 — bundles/[slug] OG renderer shipped, dropped from baseline.
  "faqs/[category]",
  "reviews/[id]",
  "scams/[id]",
  "sellers/[id]",
  // Added S7-PrizeDraws-prep3 — page shim landed; OG renderer comes
  // with SB4-G in S7-PrizeDraws-2 alongside the real detail view.
  "prize-draws/[slug]",
  // SB-UNI-F page shims landed; OG renderers deferred to per-feature sessions.
  "classified/[slug]",
  "digital-codes/[slug]",
  "live/[slug]",
  // S-STORE-12-B 2026-05-18 — item-requests/[id] page shim shipped; OG renderer
  // deferred to OG-coverage-followup tier with the rest of the per-feature OG pass.
  "item-requests/[id]",
]);

const DYNAMIC_SEGMENT_RE = /^\[(?:\.{3})?(.+?)\]$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      yield* walk(p);
    } else if (name === "page.tsx" || name === "page.ts") {
      yield p;
    }
  }
}

function isPublicRoute(routeKey) {
  const first = routeKey.split("/")[0];
  if (NON_PUBLIC_TOP_LEVELS.has(first)) return false;
  if (OG_EXEMPT_ROUTES.has(routeKey)) return false;
  return true;
}

function hasDynamicLeaf(routeKey) {
  // Detail pages always end in a dynamic segment ([slug], [id], etc.).
  const segments = routeKey.split("/");
  const leaf = segments[segments.length - 1];
  return DYNAMIC_SEGMENT_RE.test(leaf);
}

function ogSiblingExists(pagePath) {
  const dir = pagePath.replace(/page\.tsx?$/, "");
  try {
    const entries = readdirSync(dir);
    return entries.some(
      (n) => n === "opengraph-image.tsx" || n === "opengraph-image.ts" || n === "opengraph-image.jsx" || n === "opengraph-image.js",
    );
  } catch {
    return false;
  }
}

const newMisses = [];
const knownMisses = [];
const checked = [];

for (const pagePath of walk(APP_DIR)) {
  const rel = relative(APP_DIR, pagePath).replace(/\\/g, "/");
  const routeKey = rel.replace(/\/page\.tsx?$/, "");
  if (!hasDynamicLeaf(routeKey)) continue;
  if (!isPublicRoute(routeKey)) continue;
  checked.push(routeKey);
  if (ogSiblingExists(pagePath)) continue;
  if (OG_KNOWN_GAPS.has(routeKey)) {
    knownMisses.push(routeKey);
  } else {
    newMisses.push(routeKey);
  }
}

const baselineNote = ` (baseline gaps: ${knownMisses.length} known, awaiting per-feature OG renderers)`;

if (newMisses.length === 0) {
  console.log(`[verify-og-coverage] OK: ${checked.length} public dynamic detail page(s) checked${baselineNote}.`);
  process.exit(0);
}

console.error(`[verify-og-coverage] FAIL: ${newMisses.length} NEW public dynamic detail page(s) missing opengraph-image.tsx${baselineNote}:`);
for (const r of newMisses) {
  console.error(`  - ${r}`);
}
console.error("");
console.error("  Either add a sibling opengraph-image.tsx (see brands/[slug]");
console.error("  for the pattern), add the route to OG_EXEMPT_ROUTES, or add");
console.error("  it to OG_KNOWN_GAPS with a tracker entry to drive it to 0.");
process.exit(1);
