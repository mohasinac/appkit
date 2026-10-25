#!/usr/bin/env node
/*
 * Rewrite the ENTRY barrels to re-export from the module that DEFINES each
 * symbol, instead of from an intermediate sub-barrel.
 *
 * ## The problem, measured
 *
 * `src/index.ts` has ~2,331 lines of the shape
 *
 *     export { ProductCard } from "./features/products/index";
 *
 * and `./features/products/index` is itself a barrel over the whole feature.
 * So importing ONE symbol drags that feature's entire graph in. Measured on
 * dist: `client.js` has 314 re-export targets, and just the 34 barrel-shaped
 * ones close over 1,265 of its 1,345 modules — 94%. `index.js`: 79 barrel
 * targets reach 1,633 of 1,873.
 *
 * Consequence for the consumer: it reaches 2,625 of 2,640 appkit modules
 * (99.7%) while naming only ~900 distinct symbols.
 *
 * ## Why this is the fix rather than "use deep imports"
 *
 * The closure is a UNION — one file importing a barrel pulls the barrel's
 * whole graph no matter how many other files were migrated. Measured: a
 * codemod over 812 consumer/appkit import sites moved the closure 2,624 ->
 * 2,631. It went UP. Partial migration of CONSUMERS cannot work.
 *
 * Rewriting the barrel itself works because it changes what the barrel costs
 * for everyone at once, and it does not change the public API: the same symbol
 * names are exported from the same entry files. Nothing downstream edits.
 *
 * ## What it will not do — each one is a case where guessing is worse
 *
 *   - a symbol whose defining module cannot be resolved (export *, a rename
 *     chain it cannot follow, a default export with no stable name)
 *   - a target that is not actually a barrel (already a defining module)
 *   - `export *` lines — they have no symbol list to resolve
 *   - anything that would make a type-only export a value export: `export type`
 *     stays `export type`, because collapsing one into a value export creates a
 *     RUNTIME edge where tsc previously elided it, which is the opposite of
 *     the point
 *
 * Usage:
 *   node scripts/flatten-entry-barrels.mjs --dry-run
 *   node scripts/flatten-entry-barrels.mjs --apply
 *   node scripts/flatten-entry-barrels.mjs --apply --entry src/client.ts
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ENTRIES = (() => {
  const i = argv.indexOf("--entry");
  if (i >= 0 && argv[i + 1]) return [argv[i + 1]];
  return ["src/index.ts", "src/client.ts", "src/server.ts"];
})();

const norm = (p) => p.split("\\").join("/");

/** Resolve a specifier to a real source file, or null. */
function fileFor(base, spec) {
  const p = resolve(dirname(base), spec);
  for (const c of [p + ".ts", p + ".tsx", join(p, "index.ts"), join(p, "index.tsx"), p]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Is this file a barrel — i.e. does it mostly re-export rather than define? */
function isBarrel(file) {
  const src = readFileSync(file, "utf8");
  const reexports = (src.match(/^\s*export\s+(?:type\s+)?[{*]/gm) || []).length;
  const defines = (src.match(/^\s*export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|interface|type|enum)\s/gm) || []).length;
  return reexports > 0 && reexports >= defines;
}

/**
 * Where is `symbol` defined, starting from barrel `file`?
 *
 * 🛑 RETURNS THE ORIGINAL NAME TOO, and that is the whole correctness story.
 *
 * A barrel may RENAME on re-export:
 *     repositories/index.ts:  export { type UserWishlistItem as WishlistItem } ...
 * The entry then says `export { WishlistItem } from "./repositories/index"`.
 * Resolving only the MODULE and re-emitting `WishlistItem` against it produces
 * `export { WishlistItem } from ".../user-wishlist.repository"` — and that
 * module exports `UserWishlistItem`. tsc: "has no exported member named
 * 'WishlistItem'".
 *
 * A first version of this script did exactly that and produced 12 such errors
 * out of 3,358 symbols. The same bug, one module over, broke an earlier
 * codemod in this repo on the SAME symbol. So the rename is carried and
 * re-emitted as `Original as Exported`.
 *
 * @returns {{file: string, original: string} | null}
 */
function definingModule(file, symbol, seen = new Set()) {
  if (seen.has(file)) return null;
  seen.add(file);
  let src;
  try { src = readFileSync(file, "utf8"); } catch { return null; }

  // Defined right here?
  const defRe = new RegExp(
    `^\\s*export\\s+(?:declare\\s+)?(?:async\\s+)?(?:const|function|class|interface|type|enum)\\s+${symbol}\\b`,
    "m",
  );
  if (defRe.test(src)) return { file, original: symbol };

  // Named re-export, possibly renamed: export { Orig as symbol } from "./y"
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    for (const raw of m[1].split(",")) {
      const parts = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).map((s) => s.trim());
      const exported = parts[1] || parts[0];
      if (exported !== symbol) continue;
      const target = fileFor(file, m[2]);
      if (!target) return null;
      // Follow under the ORIGINAL name — that is what the target exports.
      const next = definingModule(target, parts[0], seen);
      return next ?? { file: target, original: parts[0] };
    }
  }

  // export * from "./y" — search each
  for (const m of src.matchAll(/export\s*\*\s*from\s*["']([^"']+)["']/g)) {
    const target = fileFor(file, m[1]);
    if (!target) continue;
    const found = definingModule(target, symbol, seen);
    if (found) return found;
  }
  return null;
}

/**
 * Does `file` really export `name` as a NAMED export?
 *
 * The last line of defence, and it is not redundant with the resolver: a
 * default export (`export default function ImageGallery`) satisfies neither
 * the definition regex nor any re-export pattern, yet a star-chain can still
 * lead here. Emitting a named import for it compiles to
 * "has no exported member 'X'. Did you mean to use 'import X from ...'".
 * Proving the named export exists is cheaper than enumerating the ways it
 * might not.
 */
function reallyExports(file, name) {
  let src;
  try { src = readFileSync(file, "utf8"); } catch { return false; }
  const def = new RegExp(
    `^\\s*export\\s+(?:declare\\s+)?(?:async\\s+)?(?:const|let|var|function|class|interface|type|enum)\\s+${name}\\b`,
    "m",
  );
  if (def.test(src)) return true;
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const raw of m[1].split(",")) {
      const parts = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).map((s) => s.trim());
      if ((parts[1] || parts[0]) === name) return true;
    }
  }
  return false;
}

let totalLines = 0, rewritten = 0, movedSymbols = 0;
const skips = new Map();
const bump = (k) => skips.set(k, (skips.get(k) ?? 0) + 1);

for (const entryRel of ENTRIES) {
  const entry = join(ROOT, entryRel);
  if (!existsSync(entry)) { console.log(`  (skip, missing) ${entryRel}`); continue; }
  const src = readFileSync(entry, "utf8");
  const lines = src.split("\n");
  const out = [];
  let fileRewrites = 0;

  for (const line of lines) {
    const m = line.match(/^(\s*)export\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["'];?\s*$/);
    if (!m) { out.push(line); continue; }
    totalLines++;
    const [, indent, typeKw, body, spec] = m;
    const target = fileFor(entry, spec);
    if (!target) { bump("unresolvable-target"); out.push(line); continue; }
    if (!isBarrel(target)) { bump("already-defining-module"); out.push(line); continue; }

    // Resolve every symbol on this line to its defining module.
    const groups = new Map();
    let failed = false;
    for (const raw of body.split(",")) {
      const t = raw.trim();
      if (!t) continue;
      const isTypeMember = /^type\s+/.test(t);
      const parts = t.replace(/^type\s+/, "").split(/\s+as\s+/).map((s) => s.trim());
      // What the ENTRY promises downstream. This name must not change.
      const exposedName = parts[1] || parts[0];
      const def = definingModule(target, exposedName);
      if (!def) { failed = true; break; }
      if (!reallyExports(def.file, def.original)) { failed = true; break; }
      let rel = norm(relative(dirname(entry), def.file)).replace(/\.tsx?$/, "");
      if (!rel.startsWith(".")) rel = "./" + rel;
      /* Re-emit the rename when the defining module names it differently, so
       * the entry's public surface is byte-identical to before. */
      const member = def.original === exposedName ? exposedName : `${def.original} as ${exposedName}`;
      if (!groups.has(rel)) groups.set(rel, []);
      groups.get(rel).push(isTypeMember ? `type ${member}` : member);
    }
    if (failed) { bump("unresolved-symbol"); out.push(line); continue; }
    if (groups.size === 1 && [...groups.keys()][0] === norm(spec).replace(/\.tsx?$/, "")) {
      bump("no-change"); out.push(line); continue;
    }

    for (const [rel, members] of groups) {
      out.push(`${indent}export ${typeKw ?? ""}{ ${members.join(", ")} } from "${rel}";`);
      movedSymbols += members.length;
    }
    fileRewrites++;
    rewritten++;
  }

  if (fileRewrites && APPLY) writeFileSync(entry, out.join("\n"), "utf8");
  console.log(`  ${entryRel.padEnd(16)} ${String(fileRewrites).padStart(5)} lines rewritten`);
}

console.log(`\n[flatten-entry-barrels] ${totalLines} re-export lines examined`);
console.log(`  ${APPLY ? "rewrote" : "would rewrite"} ${rewritten} line(s), ${movedSymbols} symbol(s) repointed`);
if (skips.size) {
  console.log("\n  skipped (deliberately — a guess here is worse than no change):");
  for (const [k, n] of [...skips].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(6)}  ${k}`);
}
if (!APPLY) console.log("\n(dry run — pass --apply to write)");
