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

import { maskComments } from "./lib/mask-comments.mjs";

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

  if (!edits.length) continue;

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
