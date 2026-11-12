#!/usr/bin/env node
/**
 * audit-listing-type-key-parity — the seed's listing-type KEYS must equal the
 * live `ListingType` union, exactly, in both directions.
 *
 * ## 🛑 Why this exists
 *
 * Measured 2026-11-12: `listing-types-seed-data.ts` declared `key: "collector"`
 * while the union, `PRODUCT_FIELDS.LISTING_TYPE_VALUES` and
 * `LISTING_TYPE_REGISTRY` all said `collector-drop`.
 *
 * Two registries keyed on listing type that disagree on the key itself. The
 * failure mode is the dangerous one: **no error anywhere**. A join between
 * them just matches nothing, so the type silently vanishes from whatever the
 * join fed — the same shape as the missing index that made every contest entry
 * invisible behind a successful-looking empty list.
 *
 * Nothing caught it because the seed has **never been loaded** (it is one of
 * the config tables wired to nothing), so the disagreement had no runtime
 * symptom to notice. That is precisely why it needs a static check: the day
 * the seed IS loaded is the day the drift starts costing data.
 *
 * ## What it does NOT check
 *
 * `slug` is deliberately allowed to differ from `key` — `collector-drop` is
 * published at `/collector`, and conflating the two is what produced this bug.
 * Only the KEY is compared.
 *
 * Exits non-zero on any difference. Zero tolerance: there is no legitimate
 * reason for these two lists to disagree.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "src/seed/listing-types-seed-data.ts");
const TYPES = join(ROOT, "src/features/products/types/index.ts");

function fail(msg) {
  console.error(`\n[audit-listing-type-key-parity] ${msg}\n`);
  process.exit(1);
}

const seedSrc = readFileSync(SEED, "utf8");
const seedKeys = [...seedSrc.matchAll(/key:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
if (seedKeys.length === 0) fail(`No \`key: "..."\` entries found in ${SEED}. Did the shape change?`);

const typesSrc = readFileSync(TYPES, "utf8");
const unionMatch = typesSrc.match(/export type ListingType\s*=([\s\S]*?);/);
if (!unionMatch) fail(`Could not find \`export type ListingType\` in ${TYPES}.`);
const unionKeys = [...unionMatch[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);

const seedOnly = seedKeys.filter((k) => !unionKeys.includes(k));
const unionOnly = unionKeys.filter((k) => !seedKeys.includes(k));

if (seedOnly.length || unionOnly.length) {
  const lines = [
    "Listing-type KEYS disagree between the seed and the live union.",
    "",
    "🛑 This fails SILENTLY at runtime: a join between the two matches nothing,",
    "   so the type vanishes from whatever the join feeds — no error raised.",
    "",
    `  seed  (${SEED}): ${seedKeys.join(" ")}`,
    `  union (${TYPES}): ${unionKeys.join(" ")}`,
    "",
  ];
  if (seedOnly.length) lines.push(`  in SEED only : ${seedOnly.join(" ")}`);
  if (unionOnly.length) lines.push(`  in UNION only: ${unionOnly.join(" ")}`);
  lines.push(
    "",
    "Fix: the live union wins — it has readers and stored documents behind it.",
    "Correct the seed, unless the union is genuinely gaining a type, in which",
    "case add the seed row in the SAME commit.",
    "",
    "⚠ `slug` is allowed to differ from `key` and is not checked here.",
  );
  fail(lines.join("\n"));
}

console.log(
  `[audit-listing-type-key-parity] OK — ${seedKeys.length} keys match the live union exactly.`,
);
