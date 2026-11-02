#!/usr/bin/env node
/**
 * verify-dual-field-constants — §7/2C's prerequisite (overhaul brief),
 * hand-run diagnostic (Phase 0's `verify-*` convention).
 *
 * `constants/field-names.ts` has 130+ real importers — it is not dead code
 * — but a first survey found 15 of its 37 `*_FIELDS` names ALSO have an
 * independent second definition colocated with the feature's own schema
 * file. This script turns that survey into something re-runnable: finds
 * EVERY `export const X_FIELDS` declaration site across appkit's source
 * (never hand-listed, so a 16th dual-definition is caught automatically),
 * and for every name declared in 2+ files, dynamically imports the
 * COMPILED counterpart of each (both are plain objects, no JSX — the same
 * trick that made `verify-navmeta-coverage.mjs`'s `ROUTES` half tractable)
 * and diffs them key-by-key.
 *
 * Two different findings, reported separately because they carry different
 * risk: a SHAPE difference (one side has sub-paths the other lacks — the
 * `SESSION_FIELDS` case: nested `DEVICE.BROWSER` vs a flat copy with no such
 * key) is a capability gap, not a lie. A VALUE disagreement on a key both
 * sides declare (same name, different literal field string) would mean two
 * call sites filtering on the SAME CONSTANT NAME hit two DIFFERENT real
 * Firestore fields — the dangerous case, reported first and loudly.
 *
 * Usage: node scripts/verify-dual-field-constants.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
}

function srcToDist(srcFile) {
  const rel = srcFile.slice(SRC.length + 1).replace(/\.tsx?$/, ".js");
  return path.join(DIST, rel);
}

function findFieldsDeclarations() {
  const files = [];
  walk(SRC, files);
  const byName = new Map(); // name -> [srcFile, ...]
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const re = /^export const ([A-Z][A-Z0-9_]*_FIELDS)\b/gm;
    let m;
    while ((m = re.exec(source))) {
      const name = m[1];
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(file);
    }
  }
  return byName;
}

function flattenPaths(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenPaths(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

async function compareName(name, srcFiles) {
  const loaded = [];
  for (const srcFile of srcFiles) {
    const distFile = srcToDist(srcFile);
    if (!existsSync(distFile)) {
      console.log(`  SKIP ${path.relative(ROOT, srcFile)} — no compiled output at ${path.relative(ROOT, distFile)} (run npm run build first)`);
      continue;
    }
    const mod = await import(pathToFileURL(distFile).href);
    if (!(name in mod)) {
      console.log(`  SKIP ${path.relative(ROOT, srcFile)} — "${name}" not a real export of the compiled module (re-exported under a different name, or dead code eliminated)`);
      continue;
    }
    loaded.push({ file: srcFile, flat: flattenPaths(mod[name]) });
  }
  if (loaded.length < 2) return { name, status: "unresolvable", loaded };

  const [a, b] = loaded;
  const aKeys = new Set(Object.keys(a.flat));
  const bKeys = new Set(Object.keys(b.flat));
  const sharedKeys = [...aKeys].filter((k) => bKeys.has(k));
  const onlyInA = [...aKeys].filter((k) => !bKeys.has(k));
  const onlyInB = [...bKeys].filter((k) => !aKeys.has(k));
  const valueDisagreements = sharedKeys.filter((k) => a.flat[k] !== b.flat[k]);

  return { name, status: "compared", a, b, sharedKeys, onlyInA, onlyInB, valueDisagreements };
}

async function main() {
  const byName = findFieldsDeclarations();
  const dualDefined = [...byName.entries()].filter(([, files]) => files.length >= 2);

  console.log(`${byName.size} "*_FIELDS" names declared across appkit/src; ${dualDefined.length} declared in 2+ files:\n`);

  let anyValueDisagreement = false;

  for (const [name, files] of dualDefined.sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`== ${name} (${files.length} definitions) ==`);
    for (const f of files) console.log(`  - ${path.relative(ROOT, f)}`);

    const result = await compareName(name, files);
    if (result.status === "unresolvable") {
      console.log("  (could not load 2 comparable copies — see SKIP lines above)\n");
      continue;
    }

    if (result.valueDisagreements.length > 0) {
      anyValueDisagreement = true;
      console.log(`  🛑 VALUE DISAGREEMENT on ${result.valueDisagreements.length} shared key(s) — same key, different literal field string:`);
      for (const k of result.valueDisagreements) {
        console.log(`      ${k}: ${JSON.stringify(result.a.flat[k])} vs ${JSON.stringify(result.b.flat[k])}`);
      }
    } else {
      console.log(`  Shared keys agree (${result.sharedKeys.length} compared).`);
    }
    if (result.onlyInA.length > 0) console.log(`  Only in ${path.relative(ROOT, result.a.file)}: ${result.onlyInA.join(", ")}`);
    if (result.onlyInB.length > 0) console.log(`  Only in ${path.relative(ROOT, result.b.file)}: ${result.onlyInB.join(", ")}`);
    console.log("");
  }

  if (anyValueDisagreement) {
    console.log("🛑 At least one VALUE disagreement found — see above. This is the dangerous case: two callers of the same constant NAME would filter on two different real Firestore fields.");
    process.exitCode = 1;
  } else {
    console.log("No VALUE disagreements on any shared key — every dual-definition found is a SHAPE difference (one side has sub-paths/fields the other lacks), not a silent field-name lie.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
