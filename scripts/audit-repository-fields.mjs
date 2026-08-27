#!/usr/bin/env node
/**
 * audit-repository-fields.mjs — repository Sieve field correctness checker.
 *
 * Detects two classes of bug in appkit/src/features/<feature>/repository files:
 *
 * 1. DEPRECATED J13 FIELD NAMES (SB1-G Phase 4, 2026-05-12)
 *    The legacy product boolean fields `isPreorder`, `isAuction`, and `isFeatured`
 *    were removed from ProductDocument. Queries that still use them return 0 results
 *    silently — Firestore does not error on an unknown field in a where() clause.
 *    Replacements:
 *      isPreorder==true  → listingType==pre-order
 *      isAuction==true   → listingType==auction
 *      isFeatured==true  → featured==true
 *      active==true      → status==published  (product context)
 *
 * 2. ROOT-LEVEL SORT PATHS THAT SHOULD BE NESTED UNDER stats.*
 *    The StoreDocument nests its counters inside a `stats` object.
 *    Sorting by `-itemsSold` or `-averageRating` at root level matches nothing.
 *    Correct paths: -stats.itemsSold, -stats.averageRating
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = join(__dirname, "..", "src", "features");

// ─── Rule 1: deprecated J13 field names in Sieve filter strings ──────────────
// Match the string value of a `filters:` or filters property assignment.
const FILTER_VALUE_RE = /filters\s*[:=]\s*["'`]([^"'`]+)["'`]/g;

const DEPRECATED_SIEVE_FIELDS = [
  {
    pattern: /\bisPreorder==/,
    message: "isPreorder== is removed (J13). Use listingType==pre-order",
  },
  {
    pattern: /\bisAuction==/,
    message: "isAuction== is removed (J13). Use listingType==auction",
  },
  {
    pattern: /\bisFeatured==/,
    message: "isFeatured== is removed (J13). Use featured==true",
  },
];

// ─── Rule 2: root-level sort paths that should be stats.* ───────────────────
// Match `sort: "-itemsSold"` or `sort: "itemsSold"` etc.
const ROOT_SORT_PATHS = [
  {
    pattern: /sort\s*[:=]\s*["'`]-?itemsSold["'`]/,
    message: 'sort on root "itemsSold" — use "stats.itemsSold" (nested field)',
  },
  {
    pattern: /sort\s*[:=]\s*["'`]-?averageRating["'`]/,
    message: 'sort on root "averageRating" — use "stats.averageRating" (nested field)',
  },
];

// ─── Walker (only scan repository files) ─────────────────────────────────────

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (
      (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx") &&
      // Only look at repository files, not seeds, schemas, types, or components
      (entry.name.endsWith(".repository.ts") || full.includes(`${entry.sep ?? "/"}repository${entry.sep ?? "/"}`))
    ) {
      files.push(full);
    }
  }
  return files;
}

// ─── Collect violations ───────────────────────────────────────────────────────

const violations = [];

for (const file of walk(REPO_DIR)) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  const rel = relative(join(__dirname, ".."), file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Rule 1: scan filter string values
    let m;
    const filterRe = /filters\s*[:=]\s*["'`]([^"'`]+)["'`]/g;
    while ((m = filterRe.exec(line)) !== null) {
      const filterValue = m[1];
      for (const { pattern, message } of DEPRECATED_SIEVE_FIELDS) {
        if (pattern.test(filterValue)) {
          violations.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120), message });
        }
      }
    }

    // Rule 2: scan sort values on any line
    for (const { pattern, message } of ROOT_SORT_PATHS) {
      if (pattern.test(line)) {
        violations.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120), message });
      }
    }
  }
}

// ─── Rule 3: SIEVE_PII_BYPASS ────────────────────────────────────────────────
//
// A repository that overrides `mapDoc` and ALSO reads through Sieve must route
// list rows through a mapper. `applySieveToFirestore` used to map documents
// itself — `deserializeTimestamps({ id, ...data })` — and never call `mapDoc`,
// so every Sieve-backed read silently skipped that override.
//
// The visible consequence was `/api/admin/users` serving `enc:v1:…` ciphertext
// as each user's email, because `UserRepository.mapDoc` is what decrypts. It
// also leaked `helpfulVoterIds` on the public reviews list, which
// `ReviewRepository.mapDoc` exists to strip. 14 repositories were affected.
//
// All three override CLASSES count. A dropped projection on a list is as much
// a leak as a skipped decrypt.
const sieveBypass = [];

const MAPDOC_OVERRIDE_RE = /\bprotected\s+(?:override\s+)?mapDoc\s*</;
const MAPDOC_FOR_LIST_RE = /\bprotected\s+(?:override\s+)?mapDocForList\s*</;
const USES_SIEVE_RE = /\bthis\.sieveQuery\s*[<(]|\bapplySieveToFirestore\s*[<(]/;
const DIRECT_SIEVE_RE = /\bapplySieveToFirestore\s*[<(]/;

for (const file of walk(REPO_DIR)) {
  if (extname(file) !== ".ts" || file.includes("__tests__")) continue;
  const src = readFileSync(file, "utf8");
  const rel = relative(join(__dirname, "..", ".."), file).replace(/\\/g, "/");

  if (!MAPDOC_OVERRIDE_RE.test(src)) continue;
  if (!USES_SIEVE_RE.test(src)) continue;

  // Going through `this.sieveQuery` is enough — BaseRepository passes the
  // mapper for it. A DIRECT `applySieveToFirestore(` call bypasses that and
  // must pass `mapDoc:` by hand.
  if (DIRECT_SIEVE_RE.test(src) && !/\bmapDoc\s*:/.test(src)) {
    sieveBypass.push({
      file: rel,
      line: src.slice(0, src.search(DIRECT_SIEVE_RE)).split("\n").length,
      text: "applySieveToFirestore(...) without a mapDoc: mapper",
      message:
        "this repository overrides mapDoc, so a direct applySieveToFirestore call must pass " +
        "`mapDoc: (snap) => this.mapDocForList(snap)` — otherwise its list reads skip the override",
    });
  }
  // A repository whose mapDoc decrypts a SECRET must additionally define a
  // narrower list mapper: a list has no legitimate use for a bearer token.
  if (/decryptSecret\s*\(/.test(src) && !MAPDOC_FOR_LIST_RE.test(src)) {
    sieveBypass.push({
      file: rel,
      line: src.slice(0, src.search(/decryptSecret\s*\(/)).split("\n").length,
      text: "mapDoc decrypts a secret, but there is no mapDocForList override",
      message:
        "override `mapDocForList` to drop the secret — list reads must never carry one " +
        "(listStores(activeOnly) backs the PUBLIC /stores page)",
    });
  }
}

// The chokepoint assertion. The per-file rule above stays green even if
// BaseRepository stops passing the mapper — which would unwire all 14
// repositories at once, in silence. This is the check that must never be
// removable.
{
  const basePath = join(__dirname, "..", "src", "providers", "db-firebase", "base.repository.ts");
  const baseSrc = readFileSync(basePath, "utf8");
  const sq = baseSrc.indexOf("sieveQuery");
  const applyIdx = baseSrc.indexOf("applySieveToFirestore", sq);
  const window = applyIdx > -1 ? baseSrc.slice(applyIdx, applyIdx + 600) : "";
  if (!/\bmapDoc\s*:/.test(window)) {
    sieveBypass.push({
      file: "appkit/src/providers/db-firebase/base.repository.ts",
      line: applyIdx > -1 ? baseSrc.slice(0, applyIdx).split("\n").length : 1,
      text: "BaseRepository.sieveQuery does not pass a mapDoc mapper",
      message:
        "every Sieve-backed read in every repository silently skips its mapDoc override. " +
        "Restore `mapDoc: (snap) => this.mapDocForList(snap)` in the applySieveToFirestore call",
    });
  }
}

for (const v of sieveBypass) violations.push(v);

// ─── Report ───────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log(
    "audit-repository-fields: no deprecated field names, root-level sort paths, or Sieve mapDoc bypasses found ✓",
  );
  process.exit(0);
}

const byRule = { j13: [], sort: [], sieve: [] };
for (const v of violations) {
  if (v.message.includes("mapDoc") || v.message.includes("mapDocForList")) byRule.sieve.push(v);
  else if (v.message.includes("sort on root")) byRule.sort.push(v);
  else byRule.j13.push(v);
}

const out = [`audit-repository-fields: ${violations.length} violation(s) found.\n`];

if (byRule.j13.length > 0) {
  out.push(`[J13_DEPRECATED_FIELDS] Sieve filters using removed product boolean fields (${byRule.j13.length} instances)`);
  out.push("  Fix: replace with listingType== or featured== or status== equivalents");
  for (const v of byRule.j13) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
    out.push(`    → ${v.message}`);
  }
  out.push("");
}

if (byRule.sort.length > 0) {
  out.push(`[ROOT_SORT_PATH] sort() using root-level field that lives under stats.* (${byRule.sort.length} instances)`);
  out.push("  Fix: prefix with stats. — e.g. -stats.itemsSold");
  for (const v of byRule.sort) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
    out.push(`    → ${v.message}`);
  }
  out.push("");
}

if (byRule.sieve.length > 0) {
  out.push(
    `[SIEVE_PII_BYPASS] Sieve list reads skipping the repository's mapDoc (${byRule.sieve.length} instances)`,
  );
  out.push("  A Sieve-backed list that skips mapDoc loses whatever that override does —");
  out.push("  decryption, projection, normalisation. /api/admin/users served ciphertext");
  out.push("  emails this way. There is no suppression marker: pass the mapper.");
  for (const v of byRule.sieve) {
    out.push(`  ${v.file}:${v.line}  ${v.text}`);
    out.push(`    → ${v.message}`);
  }
  out.push("");
}

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
