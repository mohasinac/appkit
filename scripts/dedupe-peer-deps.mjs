#!/usr/bin/env node
/*
 * dedupe-peer-deps.mjs — postinstall hook
 *
 * Prevents the Turbopack "dual-instance" SSR crash that bit prod on 2026-06-10
 * (appkit 2.8.8 → "No QueryClient set" on every server-rendered route).
 *
 * Root cause: when appkit is used as a local-file/submodule dependency
 * (consumer's `package.json` uses `"@mohasinac/appkit": "file:./appkit"`),
 * running `cd appkit && npm install` populates `appkit/node_modules/` with
 * the same peerDependencies that the consumer already has at its root
 * `node_modules/`. Turbopack 16 then resolves appkit-internal imports of those
 * packages to the *appkit-local* copy while the consumer's imports resolve to
 * the root copy — producing two separate `QueryClientContext` instances (and
 * two of every other React context the peer deps use). useContext mismatches
 * crash SSR.
 *
 * Fix: after any `npm install` inside appkit, delete the peer-dep duplicates.
 * Node's module resolution walks up to the consumer's `node_modules/`, so all
 * imports — both from appkit's own tsc and from Turbopack — land on the single
 * consumer copy.
 *
 * This is idempotent and silent when there's nothing to delete (e.g. when
 * appkit is consumed from npm where peerDeps were never installed).
 */
import { readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(here, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const peers = Object.keys(pkg.peerDependencies || {});

// Packages to remove:
//   1. Every entry in peerDependencies.
//   2. Transitive runtime deps of peers that ship their own React context (or any
//      other top-level singleton). Pruning the peer alone is not enough — the
//      transitive carries the duplicate context. List them explicitly so we
//      never accidentally prune type-only packages.
const TRANSITIVE_RUNTIME_DUPS = [
  // @tanstack/react-query (peer) → bundles @tanstack/query-core, which owns
  // QueryClientContext. Without this prune, Turbopack picks up the appkit-local
  // query-core and a parallel QueryClientContext instance ships in the SSR
  // bundle, producing the "No QueryClient set" crash on every page (2026-06-11).
  "@tanstack/query-core",
];

const removed = [];

function removeIfPresent(absPath, label) {
  if (existsSync(absPath)) {
    rmSync(absPath, { recursive: true, force: true });
    removed.push(label);
  }
}

for (const dep of [...peers, ...TRANSITIVE_RUNTIME_DUPS]) {
  removeIfPresent(resolve(here, "..", "node_modules", dep), dep);
}

// Clean up now-empty scope dirs (e.g. @tanstack/) so subsequent `npm install`
// doesn't trip on a phantom entry.
const scopesTouched = new Set();
for (const dep of [...peers, ...TRANSITIVE_RUNTIME_DUPS]) {
  if (dep.startsWith("@")) scopesTouched.add(dep.split("/")[0]);
}
for (const scope of scopesTouched) {
  const scopeDir = resolve(here, "..", "node_modules", scope);
  try {
    if (existsSync(scopeDir) && readdirSync(scopeDir).length === 0) {
      rmSync(scopeDir, { recursive: true, force: true });
    }
  } catch {}
}

if (removed.length > 0) {
  console.log(
    `[appkit/postinstall] removed ${removed.length} peer-dep duplicate(s) from appkit/node_modules: ${removed.join(", ")}`,
  );
}
