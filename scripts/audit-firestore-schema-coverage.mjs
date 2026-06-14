#!/usr/bin/env node
/**
 * audit-firestore-schema-coverage
 *
 * Asserts that every Firestore collection in CLAUDE.md § Seed Data Reference
 * has a corresponding entry in `SCHEMAS.firestore` at
 *   appkit/src/schemas/registry.ts
 *
 * Strict-zero (currently scoped to the W2 cohort — W3–W7 will extend the
 * expected list as their respective schemas land).
 *
 * The audit parses registry.ts as text and looks for `<collection>:` keys in
 * the `const firestore = { ... }` block. It does not import the registry at
 * runtime so it can run in CI without bundling.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APPKIT_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

// ---------------------------------------------------------------------------
// Expected Firestore collections — sourced from the W2 cohort. W3–W7 will
// extend this allowlist as additional schemas are registered.
// ---------------------------------------------------------------------------
const W2_REQUIRED_COLLECTIONS = [
  "addresses",
  "blogPosts",
  "carousels",
  "carouselSlides",
  "categories",
  "claimedCoupons",
  "conversations",
  "coupons",
  "couponUsage",
  "faqs",
  "groupedListings",
  "homepageSections",
  "orders",
  "payouts",
  "reviews",
  "scammerProfiles",
  "scammerIncidents",
  "scammerComments",
  "scammerContests",
  "serverErrors",
  "stores",
  "supportTickets",
];

const failures = [];

const registryPath = join(APPKIT_SRC, "schemas", "registry.ts");
if (!existsSync(registryPath)) {
  failures.push("schemas/registry.ts is missing.");
} else {
  const src = readFileSync(registryPath, "utf8");
  // Extract the `const firestore = { ... }` block. Greedy until the matching
  // `} as const;` (the bucket's terminator).
  const m = src.match(/const\s+firestore\s*=\s*\{([\s\S]*?)\}\s*as\s+const\s*;/);
  if (!m) {
    failures.push("Could not locate `const firestore = { ... }` block in registry.ts.");
  } else {
    const block = m[1];
    for (const collection of W2_REQUIRED_COLLECTIONS) {
      // Key may be unquoted (identifier) or quoted; check both.
      const re = new RegExp(`(?:^|\\s|,)${collection}\\s*:`, "m");
      if (!re.test(block)) {
        failures.push(`Missing Firestore schema registration: SCHEMAS.firestore.${collection}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`audit-firestore-schema-coverage: ${failures.length} violation(s).`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log(`audit-firestore-schema-coverage: OK (W2 cohort: ${W2_REQUIRED_COLLECTIONS.length} collections registered).`);
