#!/usr/bin/env node
/*
 * Append the explicit extension to every relative specifier in dist/.
 *
 * 🛑 WHY: appkit declares `"type": "module"` and its dist IS NOT VALID NATIVE
 * ESM. `tsc` does not rewrite specifiers, so `import { x } from "./utils/foo"`
 * is emitted verbatim — and Node's ESM resolver REQUIRES the extension for a
 * relative specifier. Measured before this script existed: dist/server.js had
 * **544 relative imports, every one extensionless, zero with an extension.**
 *
 * This has never been noticed because a bundler always resolved it. Turbopack
 * inlines appkit into the app, webpack did before it, and tsup inlines it into
 * functions/lib. The moment anything hands resolution to Node — which is
 * exactly what `serverExternalPackages: ["@mohasinac/appkit"]` does — all 544
 * fail at once:
 *
 *   ERR_MODULE_NOT_FOUND: Cannot find module '…/dist/utils/auth-error'
 *   imported from '…/dist/server.js'
 *
 * …while `auth-error.js` sits right there. So this is a prerequisite for
 * externalising appkit out of the app's compile graph, and it is also simply
 * correct: a package that says it ships ESM should ship ESM.
 *
 * Deliberately a POST-BUILD REWRITE rather than the two alternatives:
 *   - `moduleResolution: NodeNext` would require `.js` on every relative
 *     import in appkit/src — thousands of edits, and `.js` suffixes on .ts
 *     source reads as a mistake to every future author.
 *   - Bundling dist is a much larger change (entry boundaries, the CSS
 *     pipeline, React-context duplication across chunks) and is its own task.
 *
 * Idempotent: a specifier that already carries an extension is left alone, so
 * running twice is a no-op.
 *
 * @tag domain:build
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:rewrites appkit/dist/**\/*.js in place
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

<<<<<<< HEAD
import { maskComments } from "./lib/mask-comments.mjs";

=======
>>>>>>> 8455bd3161f074ede55320d63b7327c55614b389
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const CHECK = process.argv.includes("--check");

if (!existsSync(DIST)) {
  console.error("[fix-esm-extensions] dist/ not found — run tsc first.");
  process.exit(1);
}

/* Extensions tsc emits, plus assets a specifier may legitimately already name. */
const HAS_EXTENSION = /\.(js|mjs|cjs|json|css|node)$/;

/**
 * Resolve a relative specifier to what Node will actually need.
 *
 * Order matters: a sibling FILE wins over a directory of the same name, which
 * is what tsc's own resolution does.
 */
function resolveSpecifier(fromFile, spec) {
  if (HAS_EXTENSION.test(spec)) return null;
  const base = resolve(dirname(fromFile), spec);

  if (existsSync(`${base}.js`)) return `${spec}.js`;
  if (existsSync(base) && statSync(base).isDirectory() && existsSync(join(base, "index.js"))) {
    return `${spec.replace(/\/$/, "")}/index.js`;
  }
  return null;
}

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) files.push(p);
  }
})(DIST);

/*
 * `from "x"`, `import("x")` and the bare side-effect `import "x"`.
 * Only RELATIVE specifiers are touched — a bare one is a real package and Node
 * resolves it through node_modules exactly as it already does.
 */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.[^"']*)\2/g;

<<<<<<< HEAD
/*
 * Bare subpaths of dependencies that publish NO exports map.
 *
 * 🛑 `next` is the case that matters and it has no `exports` field at all, so
 * Node resolves `next/server` as a plain path — and under ESM a plain path
 * needs its extension. Node even suggests the fix in the error:
 *   Cannot find module '…/node_modules/next/server' …
 *   Did you mean to import "next/server.js"?
 * 117 such specifiers across appkit's dist.
 *
 * Deliberately NARROW. A package WITH an exports map must never be rewritten:
 * its map may declare `./server` and not `./server.js`, so appending would
 * break what currently works. The rule is therefore: no exports field, and the
 * `.js` file must already exist on disk.
 *
 * 🛑 FORWARD-COMPAT RISK, stated rather than buried: the day Next adds an
 * exports map declaring `./server` but not `./server.js`, this inverts and the
 * rewrite becomes the bug. The guard below will stop rewriting at that point
 * (the package would then have an exports field), but anything already emitted
 * must be rebuilt. verify-esm-dist.mjs is what would catch it.
 */
const BARE_SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([a-z@][^"'.][^"']*)\2/g;

const NODE_MODULES = resolve(ROOT, "..", "node_modules");
const exportsMapCache = new Map();

function packageHasExportsMap(pkgName) {
  if (exportsMapCache.has(pkgName)) return exportsMapCache.get(pkgName);
  let has = true; /* fail CLOSED — an unknown package is never rewritten */
  try {
    const pkgJson = JSON.parse(
      readFileSync(join(NODE_MODULES, pkgName, "package.json"), "utf8"),
    );
    has = Boolean(pkgJson.exports);
  } catch {
    has = true;
  }
  exportsMapCache.set(pkgName, has);
  return has;
}

function resolveBareSpecifier(spec) {
  if (HAS_EXTENSION.test(spec)) return null;
  const parts = spec.split("/");
  const pkgName = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  const sub = spec.slice(pkgName.length + 1);
  if (!sub) return null;
  if (packageHasExportsMap(pkgName)) return null;
  if (!existsSync(join(NODE_MODULES, pkgName, `${sub}.js`))) return null;
  return `${spec}.js`;
=======
/**
 * Blank out comments, preserving length and newlines so every index still
 * lines up with the original source.
 *
 * 🛑 REQUIRED, not tidiness. `tsc` keeps JSDoc in the emitted JS, and appkit's
 * JSDoc is full of usage EXAMPLES that look exactly like imports:
 *     cli/index.js            *   import features from "../../features.config";
 *     instrumentation/index.js  * await import("./src/providers.config");
 *     bind-all.js             *   import { CONSUMER_FUNCTIONS } from "./consumer-functions";
 * Matching those reported 4 "specifiers that resolve to nothing" — all four
 * documentation, none of them code. Rewriting inside a comment is harmless but
 * the false ERROR is not: it would have failed this script on every build.
 *
 * 🛑 AND IT MUST BE A CHARACTER WALK, NOT A REGEX. The obvious
 * `/\/\*[\s\S]*?\*\//g` is wrong here and wrong loudly: a `/*` occurring inside
 * a STRING LITERAL opens a comment the scanner never intended, and the
 * non-greedy match then blanks everything up to the next `*​/` — swallowing real
 * code wholesale. Measured on dist/server.js: the regex version masked away
 * exactly the 227 extensionless specifiers (544 raw matches -> 317 masked, 0
 * extensionless left), so the script silently "fixed" 317 of 544 and declared
 * success. Same failure CLAUDE.md records for audit-theme-drift, where a `}`
 * inside a CSS comment truncated the block and hid every token below it.
 */
function maskComments(src) {
  /*
   * 🛑 `split("")`, NOT `Array.from(src)`.
   *
   * `Array.from` iterates CODE POINTS, so a surrogate pair — every 🛑 in
   * appkit's JSDoc — becomes ONE element, while `src[i]` indexes CODE UNITS.
   * The two then disagree by one for everything after the first emoji, and the
   * mask lands at the wrong offset.
   *
   * It corrupted 34 of 2,387 files before being caught, and the symptom named
   * the cause once seen: `}from`, `awaitimport`, `Text from "…"i"` — edits
   * applied a character or two to the left, eating the space or the brace
   * before them. Only files with an emoji ABOVE an import were affected, which
   * is why it looked random.
   */
  const out = src.split("");
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    /* String and template literals — skipped whole, never masked. */
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i += 1;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i = Math.min(i + 2, n);
      for (let k = start; k < i; k += 1) if (out[k] !== "\n") out[k] = " ";
      continue;
    }

    if (c === "/" && next === "/") {
      const start = i;
      while (i < n && src[i] !== "\n") i += 1;
      for (let k = start; k < i; k += 1) out[k] = " ";
      continue;
    }

    i += 1;
  }

  return out.join("");
>>>>>>> 8455bd3161f074ede55320d63b7327c55614b389
}

let filesChanged = 0;
let rewritten = 0;
const unresolved = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const masked = maskComments(src);

  /* Collect edits against the MASKED text, apply them to the ORIGINAL. */
  const edits = [];
  for (const m of masked.matchAll(SPECIFIER)) {
    const [match, head, quote, spec] = m;
    const fixed = resolveSpecifier(file, spec);
    if (!fixed) {
      if (!HAS_EXTENSION.test(spec)) unresolved.push({ file: file.slice(DIST.length + 1), spec });
      continue;
    }
    edits.push({ start: m.index, end: m.index + match.length, text: `${head}${quote}${fixed}${quote}` });
  }

<<<<<<< HEAD
  for (const m of masked.matchAll(BARE_SPECIFIER)) {
    const [match, head, quote, spec] = m;
    const fixed = resolveBareSpecifier(spec);
    if (!fixed) continue;
    edits.push({ start: m.index, end: m.index + match.length, text: `${head}${quote}${fixed}${quote}` });
  }

  if (!edits.length) continue;

  /* Both passes append to one list, so order is not guaranteed — and the
   * apply loop below slices forward from a cursor. Sort before applying. */
  edits.sort((a, b) => a.start - b.start);

=======
  if (!edits.length) continue;

>>>>>>> 8455bd3161f074ede55320d63b7327c55614b389
  let next = "";
  let cursor = 0;
  for (const e of edits) {
    next += src.slice(cursor, e.start) + e.text;
    cursor = e.end;
  }
  next += src.slice(cursor);

  filesChanged += 1;
  rewritten += edits.length;
  if (!CHECK) writeFileSync(file, next, "utf8");
}

console.log(
  `[fix-esm-extensions] ${files.length} file(s) scanned · ` +
    `${rewritten} specifier(s) ${CHECK ? "would be " : ""}rewritten in ${filesChanged} file(s)`,
);

if (unresolved.length) {
  console.error(
    `\n🛑 ${unresolved.length} relative specifier(s) resolve to NOTHING on disk — ` +
      "these would be a runtime ERR_MODULE_NOT_FOUND:",
  );
  for (const u of unresolved.slice(0, 20)) console.error(`    ${u.file}  ->  ${u.spec}`);
  if (unresolved.length > 20) console.error(`    … and ${unresolved.length - 20} more`);
  process.exit(1);
}

if (CHECK && filesChanged) {
  console.error("\n✗ dist is not valid native ESM — run the build to rewrite it.");
  process.exit(1);
}

console.log("✓ every relative specifier in dist carries an explicit extension");
