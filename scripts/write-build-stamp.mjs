#!/usr/bin/env node
/*
 * Record WHICH SOURCE COMMIT produced `dist/`, so staleness is provable.
 *
 * 🛑 THE GAP THIS CLOSES, observed 2026-10-12. `audit-appkit-dist-sync`
 * compares `appkit/dist` against `node_modules/@mohasinac/appkit/dist` and
 * passed — "4909 files, byte-identical" — at a moment when BOTH copies were
 * built from a source commit two merges old. Agreeing with each other is not
 * the same as agreeing with `src/`, and the consumer was compiling deep
 * subpath imports against a package.json that did not declare them yet.
 *
 * So the missing axis is src -> dist, and this is the stamp that makes it
 * checkable.
 *
 * 🛑 WHY NOT mtimes. A `git checkout`, `git merge` or a fresh clone rewrites
 * every source mtime, so "newest src file is newer than dist" fires after any
 * branch switch whether or not dist is actually stale. A rule that fires
 * spuriously after every checkout is a rule people disable. The commit sha is
 * immune to all of that.
 *
 * 🛑 WHY `dirty` IS RECORDED RATHER THAN REFUSED. During development the tree
 * is dirty most of the time, and a build from a dirty tree is the normal case,
 * not an error. Refusing to stamp would mean no stamp exactly when people build
 * most; failing the audit on it would be noise. Recording it lets the audit say
 * "cannot prove" instead of guessing — the same honesty rule the rest of the
 * audits follow: report what you can prove, never what you guess.
 *
 * Writes `dist/.build-stamp.json`. Deliberately inside dist so it travels with
 * the artefact — a copy into node_modules carries its provenance with it, and
 * the published tarball does too.
 *
 * Usage: node scripts/write-build-stamp.mjs   (run from appkit's build chain)
 *
 * @tag domain:build
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:writes dist/.build-stamp.json
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const STAMP = join(DIST, ".build-stamp.json");

if (!existsSync(DIST)) {
  console.error("[write-build-stamp] dist/ does not exist — run this after tsc, inside the build chain.");
  process.exit(1);
}

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? String(r.stdout).trim() : null;
}

/*
 * A submodule checkout is normally on a detached HEAD, so the sha is the only
 * stable identifier; the branch name is recorded when there is one purely for
 * human readability and is never compared.
 */
const head = git(["rev-parse", "HEAD"]);
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
/* `--porcelain` over tracked files only: dist/ is gitignored, so a build does
 * not dirty the tree it is reporting on. */
const status = git(["status", "--porcelain"]);

if (head === null) {
  /* Not a git checkout at all — a published tarball being rebuilt, say. Stamp
   * what we can rather than failing a build over provenance metadata. */
  console.log("[write-build-stamp] no git metadata available — stamping version only");
}

const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

const stamp = {
  /* Bump only on a breaking shape change; the audit tolerates an absent stamp
   * but must not misread a future one. */
  stampVersion: 1,
  version,
  head,
  branch: branch === "HEAD" ? null : branch,
  dirty: status === null ? null : status.length > 0,
  builtAt: new Date().toISOString(),
};

writeFileSync(STAMP, `${JSON.stringify(stamp, null, 2)}\n`, "utf8");
console.log(
  `[write-build-stamp] dist built from ${head ? head.slice(0, 9) : "unknown"}` +
    `${stamp.dirty ? " (DIRTY tree — provenance is approximate)" : ""} · v${version}`,
);
