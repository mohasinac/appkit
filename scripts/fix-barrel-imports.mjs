#!/usr/bin/env node
/*
 * Rewrite barrel imports to the modules that actually DEFINE each symbol.
 *
 * 🛑 WHY, in one measurement: `import { useApiMutation } from "../../../client"`
 * resolved to appkit's own 1,280-module client entry, for a symbol defined in a
 * file whose entire graph is 39. One line, 1,241 modules of difference. Five
 * such fixes took server.ts from 2,067 modules to 1,509.
 *
 * This is Root Cause #18 ("import from the defining module") applied at scale:
 * 417 import sites inside appkit pull a target whose graph is >= 500 modules,
 * and no human is going to resolve 417 of them by hand without error.
 *
 * ── WHAT IT WILL NOT DO ─────────────────────────────────────────────────────
 *
 * Every one of these is a case where guessing would be worse than leaving the
 * import alone, so each is a hard skip rather than a best effort:
 *
 *   - a symbol whose defining module cannot be resolved (re-export chain too
 *     deep, `export *` ambiguity, a default export with no stable name)
 *   - a rewrite that would import a file into ITSELF
 *   - a rewrite that would create a NEW import cycle (checked against the real
 *     graph before writing, not after)
 *   - `import * as ns from "..."` — a namespace has no per-symbol target
 *   - side-effect imports (`import "./x"`) — the barrel may be the point
 *   - anything crossing the client/server boundary: a `"use client"` file and
 *     a server-only file must not be stitched together by a rewrite, because
 *     audit-client-entry-in-server (#76) and audit-client-server-only-leak (#6)
 *     pull in opposite directions and a mechanical fix can satisfy neither
 *
 * Type-only imports are preserved as `import type`, because collapsing one into
 * a value import would create a RUNTIME edge where tsc previously elided it —
 * which is the exact opposite of the point.
 *
 * Usage:
 *   node scripts/fix-barrel-imports.mjs --dry-run        report, write nothing
 *   node scripts/fix-barrel-imports.mjs --min-graph 500  only expensive targets
 *   node scripts/fix-barrel-imports.mjs --apply
 *
 * @tag domain:build
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:rewrites appkit/src imports when --apply
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  definingModule,
  graphSize,
  isBarrel,
  maskComments,
  readMasked,
  resolveSpec,
  sourceFiles,
  specifierFrom,
} from "./lib/module-graph.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "src");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const MIN_GRAPH = Number(
  (argv.includes("--min-graph") ? argv[argv.indexOf("--min-graph") + 1] : null) ?? 500,
);
const LIMIT = Number((argv.includes("--limit") ? argv[argv.indexOf("--limit") + 1] : null) ?? Infinity);

const files = sourceFiles(SRC);

/* A file is "client" if it carries the directive; "server" if it is under a
 * server-only path or declares server actions. Mixing them in a rewrite is
 * refused outright. */
function sideOf(file) {
  const s = readFileSync(file, "utf8");
  if (/^\s*"use client"/m.test(s)) return "client";
  if (/^\s*"use server"/m.test(s)) return "server";
  if (/[\\/]_internal[\\/]server[\\/]/.test(file)) return "server";
  return "neutral";
}

const sideCache = new Map();
function side(file) {
  if (!sideCache.has(file)) sideCache.set(file, sideOf(file));
  return sideCache.get(file);
}

function crossesBoundary(fromFile, toFile) {
  const a = side(fromFile);
  const b = side(toFile);
  if (a === "neutral" || b === "neutral") return false;
  return a !== b;
}

/* Would importing `to` from `from` close a cycle? `to` already reaching `from`
 * is exactly that. */
function wouldCycle(fromFile, toFile) {
  return graphSize(toFile).has(resolve(fromFile));
}

const IMPORT_RE =
  /import\s+(type\s+)?\{([^}]*)\}\s*from\s*"(\.[^"]+)"\s*;?/g;

let sitesSeen = 0;
let sitesRewritten = 0;
let symbolsMoved = 0;
const skips = new Map();
const perFileSavings = [];

function note(reason) {
  skips.set(reason, (skips.get(reason) ?? 0) + 1);
}

let changedFiles = 0;

for (const file of files) {
  if (changedFiles >= LIMIT) break;
  const original = readFileSync(file, "utf8");
  const masked = maskComments(original);

  const edits = [];

  for (const m of masked.matchAll(IMPORT_RE)) {
    const [match, typeKeyword, clause, spec] = m;
    const target = resolveSpec(file, spec);
    if (!target) continue;
    if (!isBarrel(target)) continue;

    const targetGraph = graphSize(target).size;
    if (targetGraph < MIN_GRAPH) continue;
    sitesSeen += 1;

    const pieces = clause
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!pieces.length) continue;

    /* Resolve every symbol first — an all-or-nothing rewrite keeps the import
     * list readable and avoids half-migrated call sites. */
    const byModule = new Map();
    let bail = null;

    for (const piece of pieces) {
      const isTypePiece = Boolean(typeKeyword) || /^type\s+/.test(piece);
      const bare = piece.replace(/^type\s+/, "");
      const [orig, alias] = bare.split(/\s+as\s+/).map((x) => x.trim());

      const def = definingModule(target, orig);
      if (!def) {
        bail = "unresolved-symbol";
        break;
      }
      if (resolve(def.file) === resolve(file)) {
        bail = "self-import";
        break;
      }
      if (crossesBoundary(file, def.file)) {
        bail = "client-server-boundary";
        break;
      }
      if (wouldCycle(file, def.file)) {
        bail = "would-create-cycle";
        break;
      }

      const key = def.file;
      if (!byModule.has(key)) byModule.set(key, { type: [], value: [] });
      const text = alias ? `${orig} as ${alias}` : orig;
      (isTypePiece || def.isType ? byModule.get(key).type : byModule.get(key).value).push(text);
    }

    if (bail) {
      note(bail);
      continue;
    }

    /* No gain if everything still lands on one barrel-sized module. */
    const newCost = [...byModule.keys()].reduce((n, f) => n + graphSize(f).size, 0);
    if (newCost >= targetGraph) {
      note("no-reduction");
      continue;
    }

    const lines = [];
    for (const [mod, { type, value }] of byModule) {
      const rel = specifierFrom(file, mod);
      if (value.length) lines.push(`import { ${value.join(", ")} } from "${rel}";`);
      if (type.length) lines.push(`import type { ${type.join(", ")} } from "${rel}";`);
    }

    edits.push({ start: m.index, end: m.index + match.length, text: lines.join("\n") });
    symbolsMoved += pieces.length;
    perFileSavings.push({ file, spec, from: targetGraph, to: newCost });
  }

  if (!edits.length) continue;

  edits.sort((a, b) => a.start - b.start);
  let next = "";
  let cursor = 0;
  for (const e of edits) {
    next += original.slice(cursor, e.start) + e.text;
    cursor = e.end;
  }
  next += original.slice(cursor);

  sitesRewritten += edits.length;
  changedFiles += 1;
  if (APPLY) writeFileSync(file, next, "utf8");
}

console.log(
  `[fix-barrel-imports] ${files.length} file(s) · barrel sites with graph >= ${MIN_GRAPH}: ${sitesSeen}`,
);
console.log(
  `  ${APPLY ? "rewrote" : "would rewrite"} ${sitesRewritten} site(s) in ${changedFiles} file(s), ` +
    `${symbolsMoved} symbol(s) repointed`,
);

if (skips.size) {
  console.log("\n  skipped (deliberately — a guess here is worse than no change):");
  for (const [reason, n] of [...skips].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${reason}`);
  }
}

if (perFileSavings.length) {
  const top = perFileSavings.sort((a, b) => b.from - b.to - (a.from - a.to)).slice(0, 10);
  console.log("\n  largest graph reductions at a single site:");
  for (const s of top) {
    console.log(
      `    ${String(s.from - s.to).padStart(5)} modules  ${s.spec}  in ` +
        `${s.file.replace(/\\/g, "/").replace(/.*appkit\/src\//, "")}`,
    );
  }
}

if (!APPLY) console.log("\n(dry run — pass --apply to write)");
