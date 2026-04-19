/**
 * Generates src/client.ts with only browser-safe named exports.
 * server-only files are never included here.
 */
import { readFileSync, existsSync, statSync, writeFileSync } from "fs";
import { resolve, dirname, join, relative } from "path";

const SRC = resolve("src");

function absPath(rel) {
  return join(SRC, rel.replace(/^\.\//, ""));
}

function resolveRel(fromFile, sub) {
  if (!sub.startsWith(".")) return null;
  const dir = dirname(absPath(fromFile));
  const candidates = [
    resolve(dir, sub),
    resolve(dir, sub + ".ts"),
    resolve(dir, sub + ".tsx"),
    resolve(dir, sub + "/index.ts"),
    resolve(dir, sub + "/index.tsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && !statSync(c).isDirectory()) {
      return relative(SRC, c).replace(/\\/g, "/");
    }
  }
  return null;
}

function getDirectExports(relFile) {
  const filePath = absPath(relFile);
  if (!existsSync(filePath) || statSync(filePath).isDirectory())
    return { values: [], types: [] };
  const text = readFileSync(filePath, "utf8");
  const values = new Set();
  const types = new Set();

  for (const m of text.matchAll(
    /^export\s+(?:default\s+)?(?:abstract\s+)?(?:declare\s+)?(?:async\s+)?(?:(?!type\b))(class|function|const|let|var|enum)\s+(\w+)/gm,
  )) {
    values.add(m[2]);
  }
  for (const m of text.matchAll(
    /^export\s+(?:declare\s+)?(?:type|interface)\s+(\w+)/gm,
  )) {
    types.add(m[1]);
  }
  for (const m of text.matchAll(
    /^export\s+(?:type\s+)?\{([^}]+)\}(?:\s+from\s+['"][^'"]+['"])?/gm,
  )) {
    const isTypeBlock = /^export\s+type\s+\{/.test(m[0]);
    for (const raw of m[1].split(",")) {
      const trimmedRaw = raw.trim().replace(/^type\s+/, "");
      const parts = trimmedRaw.split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      const isType = isTypeBlock || /^\s*type\s+/.test(raw);
      if (name && /^\w+$/.test(name) && name !== "default") {
        if (isType) types.add(name);
        else values.add(name);
      }
    }
  }

  // follow export * from './x' one level
  for (const m of text.matchAll(
    /^export\s+\*\s+(?:as\s+\w+\s+)?from\s+['"]([^'"]+)['"]/gm,
  )) {
    const resolved = resolveRel(relFile, m[1]);
    if (resolved) {
      const sub = getDirectExports(resolved);
      sub.values.forEach((v) => values.add(v));
      sub.types.forEach((t) => types.add(t));
    }
  }

  return { values: [...values].sort(), types: [...types].sort() };
}

// Browser-safe files ONLY — no server-only imports
const CLIENT_FILES = [
  "tokens/index.ts",
  "ui/index.ts",
  "react/index.ts",
  "values/index.ts",
  "utils/index.ts",
  "constants/index.ts",
  "contracts/index.ts",
  "validation/index.ts",
  "errors/index.ts",
  "seo/index.ts",
  "cli/index.ts",
  "core/baseline-resolver.ts",
  "next/routing/route-map.ts",
  "next/request-helpers.ts",
];

// Specific named exports from next/index (only the safe subset)
const NEXT_SAFE = {
  values: ["GlobalError", "ErrorView", "NotFoundView", "UnauthorizedView"],
  types: [
    "GlobalErrorProps",
    "ErrorViewProps",
    "NotFoundViewProps",
    "UnauthorizedViewProps",
  ],
};

const seen = new Set();
const lines = [
  "// AUTO-GENERATED — browser-safe barrel",
  "// Run: node scripts/generate-client.mjs",
  "",
];

for (const file of CLIENT_FILES) {
  const { values, types } = getDirectExports(file);
  const srcPath = "./" + file.replace(/\.tsx?$/, "");

  const newValues = values.filter((v) => !seen.has(v));
  const newTypes = types.filter((t) => !seen.has(t));
  newValues.forEach((v) => seen.add(v));
  newTypes.forEach((t) => seen.add(t));

  if (newValues.length > 0) {
    lines.push(`export { ${newValues.join(", ")} } from "${srcPath}";`);
  }
  if (newTypes.length > 0) {
    lines.push(`export type { ${newTypes.join(", ")} } from "${srcPath}";`);
  }
}

// Add safe next exports
const nextValues = NEXT_SAFE.values.filter((v) => !seen.has(v));
const nextTypes = NEXT_SAFE.types.filter((t) => !seen.has(t));
nextValues.forEach((v) => seen.add(v));
nextTypes.forEach((t) => seen.add(t));
if (nextValues.length)
  lines.push(`export { ${nextValues.join(", ")} } from "./next/index";`);
if (nextTypes.length)
  lines.push(`export type { ${nextTypes.join(", ")} } from "./next/index";`);

writeFileSync(join(SRC, "client.ts"), lines.join("\n") + "\n");
console.log("Written src/client.ts");
console.log("Total client exports:", seen.size);
