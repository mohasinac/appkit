#!/usr/bin/env node
/**
 * scaffold-feature — reads a `FeatureManifest` (contracts/feature.ts) and
 * either checks it against real route files, or writes stub files for
 * review. Redirected into appkit 2026-11-02 (Phase 2F, overhaul brief): the
 * owner's instruction was to move this logic here rather than edit the
 * separate `@mohasinac/cli` package, consistent with the plan's own North
 * Star ("anything genuinely reusable belongs in appkit").
 *
 * `FeatureManifest` had ZERO readers before this — 30 `manifest.ts` files
 * existed as a contract with nothing consuming it. This is the first.
 *
 * Reads compiled `dist/**\/manifest.js` (not the `.ts` source) so the real
 * TypeScript compiler is the parser — no regex/eval over source text. Run
 * `npm run build` first if `dist/` is stale.
 *
 * Usage (from appkit/):
 *   node scripts/scaffold-feature.mjs list
 *   node scripts/scaffold-feature.mjs check <name> [--app-dir <path>]
 *   node scripts/scaffold-feature.mjs scaffold <name> [--out <path>]
 *
 * `--app-dir` defaults to `../src` (the consumer's `src/`, this repo's own
 * local-dev layout — appkit and letitrip.in/ are siblings).
 * `--out` defaults to `.scaffold-output/<name>` (gitignored scratch dir —
 * NEVER the consumer's real `src/app`, which would overwrite working pages).
 *
 * Exit: 0 = clean / wrote output, 1 = `check` found a gap, 2 = misuse.
 */

import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_ROOT = path.resolve(__dirname, "..", "dist");

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry === "manifest.js") out.push(full);
  }
}

async function discoverManifests() {
  if (!existsSync(DIST_ROOT)) {
    throw new Error(`dist/ not found at ${DIST_ROOT} — run "npm run build" first.`);
  }
  const files = [];
  walk(DIST_ROOT, files);
  const found = [];
  for (const file of files) {
    let mod;
    try {
      mod = await import(pathToFileURL(file).href);
    } catch {
      // Not every `manifest.js` in the tree is a `FeatureManifest` —
      // `_internal/server/functions/manifest.ts` (the Firebase Functions
      // registry) and `_internal/server/features/assistant/tools/manifest.ts`
      // (a tool-schema builder FUNCTION, not a data export named `manifest`)
      // both carry this filename for unrelated reasons, and some of their own
      // import chains are not safe to execute outside their real runtime.
      // Skipped rather than failing the whole scan for one unrelated file.
      continue;
    }
    // `src/seed/manifest.ts` exports `SEED_MANIFEST` (a seed-data preview
    // index, unrelated contract) — filtering on the `manifest` export name
    // excludes it without a hand-maintained path exclusion list.
    if (mod.manifest && typeof mod.manifest === "object" && typeof mod.manifest.name === "string") {
      found.push({ file, manifest: mod.manifest });
    }
  }
  return found;
}

function parseArgs(argv) {
  const [cmd, name, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--app-dir") opts.appDir = rest[++i];
    else if (rest[i] === "--out") opts.out = rest[++i];
  }
  return { cmd, name, opts };
}

function pagePathFor(appDir, segment) {
  return path.join(appDir, "app", segment, "page.tsx");
}

function routePathFor(appDir, segment) {
  return path.join(appDir, "app", segment, "route.ts");
}

async function cmdList() {
  const manifests = await discoverManifests();
  console.log(`${manifests.length} feature manifest(s) found:\n`);
  for (const { manifest } of manifests.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))) {
    console.log(
      `  ${manifest.name.padEnd(20)} ${manifest.routes.length} route(s), ${manifest.apiRoutes.length} api route(s), i18n="${manifest.i18nNamespace}"`,
    );
  }
}

async function cmdCheck(name, opts) {
  const manifests = await discoverManifests();
  const found = manifests.find((m) => m.manifest.name === name);
  if (!found) {
    console.error(`No manifest named "${name}". Run "list" to see what exists.`);
    process.exit(2);
  }
  const appDir = path.resolve(__dirname, "..", opts.appDir ?? "../src");
  const { manifest } = found;
  const missing = [];
  for (const route of manifest.routes) {
    const p = pagePathFor(appDir, route.segment);
    if (!existsSync(p)) missing.push({ kind: "page", segment: route.segment, path: p });
  }
  for (const apiRoute of manifest.apiRoutes) {
    const p = routePathFor(appDir, apiRoute.segment);
    if (!existsSync(p)) missing.push({ kind: "api", segment: apiRoute.segment, path: p });
  }
  if (missing.length === 0) {
    console.log(`"${name}" — all ${manifest.routes.length + manifest.apiRoutes.length} declared route(s) exist on disk.`);
    return;
  }
  console.log(`"${name}" — ${missing.length} declared route(s) have no real file (manifest is stale, or the route is handled by a shared/generic endpoint):\n`);
  for (const m of missing) {
    console.log(`  MISSING [${m.kind}] ${m.segment}  (expected ${m.path})`);
  }
  process.exitCode = 1;
}

function pageStub(route) {
  const comment = route.adminOnly
    ? "// ADMIN-ONLY — wrap this route's layout/page in the project's admin RBAC gate.\n"
    : "";
  const metadataImport = route.exports.generateMetadata
    ? `, ${route.exports.generateMetadata}`
    : "";
  return `${comment}import { ${route.exports.default}${metadataImport} } from "@mohasinac/appkit/views";

${route.exports.generateMetadata ? `export { ${route.exports.generateMetadata} as generateMetadata };\n\n` : ""}export default function Page() {
  return <${route.exports.default} />;
}
`;
}

function apiRouteStub(apiRoute) {
  const handlers = apiRoute.methods
    .map(
      (m) => `export async function ${m}() {
  throw new Error("Scaffolded stub for ${apiRoute.segment} — wire a real handler.");
}`,
    )
    .join("\n\n");
  return `${handlers}\n`;
}

async function cmdScaffold(name, opts) {
  const manifests = await discoverManifests();
  const found = manifests.find((m) => m.manifest.name === name);
  if (!found) {
    console.error(`No manifest named "${name}". Run "list" to see what exists.`);
    process.exit(2);
  }
  const { manifest } = found;
  const outDir = path.resolve(__dirname, "..", opts.out ?? `.scaffold-output/${name}`);

  for (const route of manifest.routes) {
    const dest = path.join(outDir, "app", route.segment, "page.tsx");
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, pageStub(route), "utf8");
  }
  for (const apiRoute of manifest.apiRoutes) {
    const dest = path.join(outDir, "app", apiRoute.segment, "route.ts");
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, apiRouteStub(apiRoute), "utf8");
  }

  console.log(`Scaffolded "${name}" to ${outDir}`);
  console.log(`  ${manifest.routes.length} page stub(s), ${manifest.apiRoutes.length} api route stub(s)`);
  if (manifest.envKeys.length > 0) {
    console.log(`  Required env vars (documentation only — add these to .env.local):`);
    for (const key of manifest.envKeys) console.log(`    ${key}`);
  }
  console.log(`  i18n namespace: "${manifest.i18nNamespace}" — add messages/en.json["${manifest.i18nNamespace}"] if missing.`);
  console.log(`\nReview before copying anything into the real src/app tree — this never writes there directly.`);
}

async function main() {
  const { cmd, name, opts } = parseArgs(process.argv.slice(2));
  if (cmd === "list") return cmdList();
  if (cmd === "check") {
    if (!name) {
      console.error("Usage: scaffold-feature.mjs check <name> [--app-dir <path>]");
      process.exit(2);
    }
    return cmdCheck(name, opts);
  }
  if (cmd === "scaffold") {
    if (!name) {
      console.error("Usage: scaffold-feature.mjs scaffold <name> [--out <path>]");
      process.exit(2);
    }
    return cmdScaffold(name, opts);
  }
  console.error("Usage: scaffold-feature.mjs <list|check|scaffold> [name] [options]");
  process.exit(2);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
