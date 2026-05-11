#!/usr/bin/env node
/**
 * appkit-smoke-bundle — client bundle leak checker.
 *
 * After `next build`, greps .next/static/chunks/*.js for tokens that must
 * never appear in the client bundle (e.g. "firebase-admin", "node:fs").
 *
 * Reads appkit.config.js from cwd for bundleForbidden list.
 * Exits 0 on clean, 1 on violations.
 *
 * Usage: npx appkit-smoke-bundle [--dir .next/static/chunks]
 */

import { readdir, readFile } from "fs/promises";
import { join, extname, existsSync } from "path";
import { pathToFileURL } from "url";

const CWD = process.cwd();

let config = null;
const CONFIG_PATHS = [join(CWD, "appkit.config.js"), join(CWD, "appkit.config.mjs")];
for (const p of CONFIG_PATHS) {
  if (existsSync(p)) {
    const mod = await import(pathToFileURL(p).href);
    config = mod.default ?? mod;
    break;
  }
}

const forbidden = config?.bundleForbidden ?? ["firebase-admin", "node:fs", "node:child_process"];

const chunksArg = process.argv.includes("--dir")
  ? process.argv[process.argv.indexOf("--dir") + 1]
  : join(CWD, ".next", "static", "chunks");

if (!existsSync(chunksArg)) {
  console.log(`appkit-smoke-bundle: chunks dir not found: ${chunksArg}. Run next build first.`);
  process.exit(0);
}

const files = (await readdir(chunksArg)).filter((f) => extname(f) === ".js");
let violations = 0;

for (const file of files) {
  const src = await readFile(join(chunksArg, file), "utf8");
  for (const token of forbidden) {
    if (src.includes(token)) {
      console.error(`[VIOLATION] '${token}' found in ${file}`);
      violations++;
    }
  }
}

if (violations === 0) {
  console.log(`appkit-smoke-bundle: ${files.length} chunks clean ✓`);
  process.exit(0);
} else {
  console.error(`\nappkit-smoke-bundle: ${violations} violation(s) found.`);
  process.exit(1);
}
