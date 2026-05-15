#!/usr/bin/env node
/**
 * appkit/scripts/firebase-merge.mjs
 *
 * Merges appkit base Firebase configs with optional consumer extensions,
 * writes the merged output files into the consumer project root, and
 * optionally triggers `firebase deploy`.
 *
 * ─── Usage (run from consumer project root) ────────────────────────────────
 *   node ../appkit/scripts/firebase-merge.mjs
 *   node ../appkit/scripts/firebase-merge.mjs --deploy
 *   node ../appkit/scripts/firebase-merge.mjs --deploy --only firestore:rules,firestore:indexes
 *   node ../appkit/scripts/firebase-merge.mjs --deploy --only storage
 *   node ../appkit/scripts/firebase-merge.mjs --deploy --only database
 *
 * ─── Consumer extensions (appkit.config.js) ───────────────────────────────
 *   Declare consumer-specific Firebase extensions inside `appkit.config.js`:
 *
 *   module.exports = {
 *     firebase: {
 *       projectId: "my-project",
 *       extensions: {
 *         indexes: [
 *           { collectionGroup: "...", queryScope: "COLLECTION", fields: [...] }
 *         ],
 *         fieldOverrides: [],
 *         database: { custom_path: { ".read": "...", ".write": "..." } },
 *         firestoreRules: "    // custom rules\n",
 *         storageRules: "    match /public/{file} { allow read: if true; }\n",
 *       },
 *     },
 *   };
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_DIR = resolve(__dirname, "../firebase/base");
const CWD = process.cwd();

// ─── CLI args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const shouldDeploy = args.includes("--deploy");
const onlyIdx = args.indexOf("--only");
const deployOnly = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

// ─── Helpers ──────────────────────────────────────────────────────────────

function readJson(filePath) {
  // Strip BOM and JS-style line comments (Firebase RTDB rules use them)
  const raw = readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\/\/[^\n]*/g, "")
    .trimStart();
  return JSON.parse(raw);
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  ✓ ${filePath}`);
}

function writeText(filePath, content) {
  writeFileSync(filePath, content, "utf8");
  console.log(`  ✓ ${filePath}`);
}

/** Recursively merge two plain objects. Arrays in `source` replace those in `target`. */
function deepMerge(target, source) {
  if (typeof source !== "object" || source === null) return source;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      key in result &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/** Stable fingerprint for a Firestore index entry used for deduplication. */
function indexFingerprint(index) {
  return `${index.collectionGroup}:${index.queryScope}:${JSON.stringify(index.fields)}`;
}

const GENERATED_HEADER = (source) =>
  `// AUTO-GENERATED - do not edit manually.\n` +
  `// Source: @mohasinac/appkit/firebase/base/${source}\n` +
  `// Regenerate: npm run firebase:generate\n\n`;

// ─── Load consumer extensions from appkit.config.js ──────────────────────

function loadAppkitConfig(cwd) {
  const candidates = ["appkit.config.js", "appkit.config.mjs", "appkit.config.cjs"];
  for (const name of candidates) {
    const p = join(cwd, name);
    if (!existsSync(p)) continue;
    try {
      const require = createRequire(import.meta.url);
      const mod = require(p);
      return mod?.default ?? mod;
    } catch {
      return null;
    }
  }
  return null;
}

const appkitConfig = loadAppkitConfig(CWD);
const ext = appkitConfig?.firebase?.extensions ?? {};

console.log(`\nappkit firebase-merge`);
console.log(`  base    : ${BASE_DIR}`);
console.log(`  consumer: ${CWD}`);
console.log(
  `  extensions: ${Object.keys(ext).length ? "appkit.config.js → firebase.extensions" : "(none)"}\n`,
);

// ─── 1. Firestore indexes ──────────────────────────────────────────────────

console.log("→ firestore.indexes.json");
const baseIdx = readJson(resolve(BASE_DIR, "firestore.indexes.json"));
const extIdxEntries = ext.indexes ?? [];
const extFieldOverrides = ext.fieldOverrides ?? [];

const seen = new Set(baseIdx.indexes.map(indexFingerprint));
const mergedIndexes = [...baseIdx.indexes];
for (const entry of extIdxEntries) {
  const fp = indexFingerprint(entry);
  if (!seen.has(fp)) {
    seen.add(fp);
    mergedIndexes.push(entry);
  }
}
writeJson(resolve(CWD, "firestore.indexes.json"), {
  indexes: mergedIndexes,
  fieldOverrides: [...(baseIdx.fieldOverrides ?? []), ...extFieldOverrides],
});

// ─── 2. Firestore rules ────────────────────────────────────────────────────

console.log("→ firestore.rules");
let firestoreRules = readText(resolve(BASE_DIR, "firestore.rules"));
if (ext.firestoreRules) {
  // Inject before the outer closing braces
  firestoreRules = firestoreRules.replace(
    /(\n\s*}\s*\n\s*}\s*\n?)$/,
    `\n${ext.firestoreRules}\n$1`,
  );
}
writeText(
  resolve(CWD, "firestore.rules"),
  GENERATED_HEADER("firestore.rules") + firestoreRules,
);

// ─── 3. Storage rules ──────────────────────────────────────────────────────

console.log("→ storage.rules");
let storageRules = readText(resolve(BASE_DIR, "storage.rules"));
if (ext.storageRules) {
  storageRules = storageRules.replace(
    /(\n\s*}\s*\n\s*}\s*\n?)$/,
    `\n${ext.storageRules}\n$1`,
  );
}
writeText(
  resolve(CWD, "storage.rules"),
  GENERATED_HEADER("storage.rules") + storageRules,
);

// ─── 4. RTDB database rules ────────────────────────────────────────────────

console.log("→ database.rules.json");
const baseDb = readJson(resolve(BASE_DIR, "database.rules.json"));
const mergedDb = ext.database
  ? deepMerge(baseDb, { rules: ext.database })
  : baseDb;
writeJson(resolve(CWD, "database.rules.json"), mergedDb);

// ─── 5. Optional deploy ────────────────────────────────────────────────────

if (shouldDeploy) {
  const targets =
    deployOnly ?? "firestore:rules,firestore:indexes,storage,database";
  const cmd = `firebase deploy --only ${targets}`;
  console.log(`\n→ ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: CWD });
  } catch {
    process.exit(1);
  }
} else {
  console.log("\n✓ Done. Run with --deploy to push to Firebase.");
}
