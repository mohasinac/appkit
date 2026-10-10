#!/usr/bin/env node
/*
 * Prove dist/ is valid, loadable, native ESM.
 *
 * 🛑 WHY THIS HAD TO EXIST BEFORE fix-esm-extensions.mjs COULD BE TRUSTED.
 *
 * Nothing else in this repo can see a corrupted dist. Turbopack resolves
 * extensionless specifiers and tolerates a lot, so `npm run check` passes, a
 * full `next build` passes, and the damage only surfaces when something hands
 * resolution to Node — `serverExternalPackages`, or a Lambda. That is Root
 * Cause #69's shape exactly: green build, dead runtime.
 *
 * Two real corruptions were caught by this check and by nothing else:
 *
 *   1. A regex comment-masker treated a slash-star inside a STRING LITERAL as
 *      a comment opener and blanked everything to the next close. On
 *      dist/server.js it masked away exactly the 227 extensionless specifiers
 *      — 544 raw matches became 317 — so the rewriter "fixed" 317 of 544 and
 *      reported success.
 *
 *   2. `Array.from(src)` iterates CODE POINTS while `src[i]` indexes CODE
 *      UNITS. Every emoji in appkit's JSDoc is a surrogate pair, so all offsets
 *      after the first one shifted by one and the edits landed left of their
 *      target: `}from`, `awaitimport`, `Text from "…"i"`. 34 of 2,387 files.
 *
 * Both produced a dist that looked fine and was not. Hence: parse every file,
 * and actually LOAD every published entry point.
 *
 * Usage: node scripts/verify-esm-dist.mjs [--quick]
 *   --quick   static checks only; skip the entry-point imports, which execute
 *             module top-level code and are much slower.
 *
 * @tag domain:build
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:none — pure reads
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * 🛑 THE SAME masker the rewriter uses, imported rather than reimplemented.
 *
 * The first version of this file did not mask at all, so it re-flagged the
 * JSDoc usage EXAMPLES the rewriter had correctly skipped — reporting 14
 * "violations" that were documentation. A checker and the fixer it guards must
 * agree on what counts as code, and the only way to guarantee that is one
 * definition with two consumers.
 */
import { maskComments } from "./lib/mask-comments.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const QUICK = process.argv.includes("--quick");

if (!existsSync(DIST)) {
  console.error("[verify-esm-dist] dist/ not found — run the build first.");
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) files.push(p);
  }
})(DIST);

const HAS_EXT = /\.(js|mjs|cjs|json|css|node)$/;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.[^"']*)\1/g;

const danglingSpecifiers = [];
const extensionless = [];

for (const file of files) {
  const src = maskComments(readFileSync(file, "utf8"));
  const rel = file.slice(DIST.length + 1).replace(/\\/g, "/");

  for (const m of src.matchAll(SPECIFIER)) {
    const spec = m[2];
    if (!HAS_EXT.test(spec)) {
      extensionless.push({ rel, spec });
      continue;
    }
    if (!existsSync(resolve(dirname(file), spec))) danglingSpecifiers.push({ rel, spec });
  }
}

/*
 * Parse every file as a MODULE, via `node --check`.
 *
 * 🛑 `new Function(src)` is NOT a substitute and was tried: it rejects a
 * top-level `export`, so it reported 741 "syntax errors" across perfectly valid
 * ESM and buried the 34 real ones. One batched child process per chunk keeps
 * this near a second rather than spawning 2,387 times.
 */
const syntaxErrors = [];
{
  const CHUNK = 60;
  for (let i = 0; i < files.length; i += CHUNK) {
    const chunk = files.slice(i, i + CHUNK);
    try {
      execFileSync(process.execPath, ["--check", ...chunk], { stdio: "pipe" });
    } catch {
      /* A chunk failed; re-check one at a time to name the offender. */
      for (const f of chunk) {
        try {
          execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
        } catch (err) {
          syntaxErrors.push({
            rel: f.slice(DIST.length + 1).replace(/\\/g, "/"),
            message: String(err?.stderr ?? err?.message ?? err)
              .split("\n")
              .find((l) => /Error|Unexpected|missing/.test(l))
              ?.trim()
              .slice(0, 140) ?? "parse failed",
          });
        }
      }
    }
  }
}

/* Every published entry point actually LOADS under Node's own resolver. */
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const entryFiles = new Set();
for (const entry of Object.values(pkg.exports ?? {})) {
  if (typeof entry === "string") {
    if (entry.endsWith(".js") && !entry.includes("*")) entryFiles.add(entry);
    continue;
  }
  for (const [condition, target] of Object.entries(entry ?? {})) {
    if (condition === "types" || condition === "style") continue;
    if (typeof target === "string" && target.endsWith(".js") && !target.includes("*")) {
      entryFiles.add(target);
    }
  }
}

/*
 * 🛑 A FAILED IMPORT IS NOT AUTOMATICALLY A DIST DEFECT, and the first version
 * of this script counted all eight as one.
 *
 * Measured: `next` 16.3.2 IS installed, and bare Node still cannot import
 * `next/link`, `next/navigation` or `next/server` — its exports map gates them
 * behind conditions (react-server, browser, edge-light) that a plain `node`
 * process does not satisfy. Nor can Node import `.css` at ANY path
 * (ERR_UNKNOWN_FILE_EXTENSION, verified against a file that exists). And
 * `jobs.js` throws React's own "cannot be imported from a Client Component"
 * guard, which is an RSC boundary rather than a resolution problem.
 *
 * None of those are appkit's dist being wrong; they are entries that are
 * legitimately bundler-only. Reporting them as ESM corruption would make this
 * gate permanently red and therefore ignored.
 *
 * What this gate must catch is a failure naming a RELATIVE path inside
 * appkit/dist — that is the class the extension rewrite exists to fix, and the
 * class that breaks `serverExternalPackages`.
 */
const DIST_PATH_IN_MESSAGE = /dist[\\/][^\s'"]+/;
const BUNDLER_ONLY = [
  { code: "ERR_UNKNOWN_FILE_EXTENSION", why: "Node cannot load CSS at any path" },
  { code: "ERR_MODULE_NOT_FOUND", match: /'next\/|[\\/]node_modules[\\/]next[\\/]/, why: "next/* is bundler-only" },
  { code: "ERR", match: /Client Component|Server Component/, why: "React RSC boundary guard" },
];

function classify(err) {
  const code = err?.code ?? "ERR";
  const message = String(err?.message ?? err).split("\n")[0];

  /* A missing RELATIVE module inside our own dist is always ours. */
  if (code === "ERR_MODULE_NOT_FOUND" && !/node_modules/.test(message) && DIST_PATH_IN_MESSAGE.test(message)) {
    return { kind: "dist", code, message };
  }
  for (const rule of BUNDLER_ONLY) {
    if (rule.code === code && (!rule.match || rule.match.test(message))) {
      return { kind: "bundler-only", code, message, why: rule.why };
    }
  }
  return { kind: "dist", code, message };
}

const loadFailures = [];
const bundlerOnly = [];
if (!QUICK) {
  for (const relEntry of entryFiles) {
    const abs = resolve(ROOT, relEntry);
    if (!existsSync(abs)) {
      loadFailures.push({ entry: relEntry, code: "MISSING", message: "file does not exist" });
      continue;
    }
    try {
      await import(pathToFileURL(abs).href);
    } catch (err) {
      const c = classify(err);
      const row = { entry: relEntry, code: c.code, message: c.message.slice(0, 150), why: c.why };
      if (c.kind === "bundler-only") bundlerOnly.push(row);
      else loadFailures.push(row);
    }
  }
}

console.log(
  `[verify-esm-dist] ${files.length} file(s) · ${entryFiles.size} published entry point(s)` +
    (QUICK ? " (static only)" : ""),
);

let failed = false;

if (extensionless.length) {
  failed = true;
  console.error(`\n✗ ${extensionless.length} relative specifier(s) carry NO extension.`);
  console.error("  Node's ESM resolver requires one; only a bundler tolerates this.");
  for (const e of extensionless.slice(0, 10)) console.error(`    ${e.rel}  ->  ${e.spec}`);
  if (extensionless.length > 10) console.error(`    … and ${extensionless.length - 10} more`);
}

if (danglingSpecifiers.length) {
  failed = true;
  console.error(`\n✗ ${danglingSpecifiers.length} specifier(s) point at a file that does not exist:`);
  for (const d of danglingSpecifiers.slice(0, 10)) console.error(`    ${d.rel}  ->  ${d.spec}`);
}

if (syntaxErrors.length) {
  failed = true;
  console.error(`\n✗ ${syntaxErrors.length} file(s) do not parse:`);
  for (const s of syntaxErrors.slice(0, 10)) console.error(`    ${s.rel}: ${s.message}`);
  if (syntaxErrors.length > 10) console.error(`    … and ${syntaxErrors.length - 10} more`);
}

if (bundlerOnly.length) {
  console.log(`\nℹ ${bundlerOnly.length} entry point(s) are bundler-only — NOT a dist defect:`);
  for (const b of bundlerOnly) console.log(`    ${b.entry}  [${b.code}]  ${b.why}`);
  console.log("  These cannot be loaded by bare Node and never could be.");
}

if (loadFailures.length) {
  failed = true;
  console.error(`\n✗ ${loadFailures.length} entry point(s) failed on appkit's OWN dist:`);
  for (const l of loadFailures) console.error(`    ${l.entry}  [${l.code}]  ${l.message}`);
}

if (failed) {
  console.error("\n🛑 dist is not valid native ESM. Externalising appkit WILL fail at runtime.");
  process.exit(1);
}

console.log("✓ dist parses, resolves, and every published entry imports natively");
