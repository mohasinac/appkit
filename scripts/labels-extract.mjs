#!/usr/bin/env node
/**
 * appkit-labels-extract — generate JSON template from all appkit *Labels types.
 *
 * Walks dist/_internal/client/**/*.js looking for DEFAULT_*_LABELS exports,
 * aggregates them into a single JSON template with English defaults, and
 * writes to the specified output file.
 *
 * Consumer merges the output into their own messages/en.json.
 *
 * Usage: npx appkit-labels-extract --out messages/appkit-keys.en.json
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, extname, relative, existsSync } from "path";
import { fileURLToPath } from "url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST_INTERNAL = join(ROOT, "dist", "_internal", "client");

const outArg = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : join(process.cwd(), "messages", "appkit-keys.en.json");

if (!existsSync(DIST_INTERNAL)) {
  console.log("appkit-labels-extract: dist/_internal/client not found — run npm run build first.");
  process.exit(0);
}

async function walk(dir) {
  let results = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) results = results.concat(await walk(full));
    else if (extname(e.name) === ".js") results.push(full);
  }
  return results;
}

const files = await walk(DIST_INTERNAL);
const labels = {};

for (const file of files) {
  const src = await readFile(file, "utf8");
  // Match: export const DEFAULT_FOO_LABELS = { key: "value", ... }
  const matches = src.matchAll(/export\s+const\s+DEFAULT_(\w+)_LABELS\s*=\s*\{([^}]+)\}/g);
  for (const match of matches) {
    const namespace = match[1].toLowerCase().replace(/_/g, ".");
    const body = match[2];
    const entries = {};
    const kvMatches = body.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g);
    for (const kv of kvMatches) {
      entries[kv[1]] = kv[2];
    }
    if (Object.keys(entries).length > 0) {
      labels[namespace] = entries;
    }
  }
}

await mkdir(dirname(outArg), { recursive: true });
await writeFile(outArg, JSON.stringify(labels, null, 2) + "\n", "utf8");
console.log(`appkit-labels-extract: wrote ${Object.keys(labels).length} namespace(s) to ${outArg}`);
