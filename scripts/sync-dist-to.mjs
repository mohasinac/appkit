/**
 * Copy appkit's built `dist` into a consumer's `node_modules/@mohasinac/appkit`.
 *
 * ## Why this exists — and why `npm publish` is the wrong tool for iteration
 *
 * Owner, 2026-11-10: *"why are you keep on publishing appkit if there is no
 * fix, just copy dist for docker or syslink including for the subdomains"*.
 *
 * Correct, and the cost was real: three versions went to npm in one session
 * (4.84.0, 4.85.0, 4.85.1) and **4.85.0 was burned entirely on a brand string
 * that leaked into a `.d.ts`**. npm versions are IMMUTABLE — a mistake cannot
 * be withdrawn, only superseded, so every iteration-by-publish permanently
 * consumes a version number and leaves a broken release in the registry.
 *
 * Publish when there is a RELEASE. Sync when you are iterating.
 *
 * 🛑 `npm link` DOES NOT WORK HERE. Turbopack cannot resolve the symlinked
 * package and the build dies with 193 × `Can't resolve '@mohasinac/appkit'`.
 * A REAL DIRECTORY resolves correctly, which is why this copies rather than
 * links — the same approach `scripts/sync-appkit.mjs` already takes in the
 * shop, generalised so the subdomains can use it too.
 *
 * ## Usage, from the repo root
 *   node appkit/scripts/sync-dist-to.mjs appkit/events
 *   node appkit/scripts/sync-dist-to.mjs appkit/events appkit/blogs --all
 *   node appkit/scripts/sync-dist-to.mjs --all        # every sibling app
 *
 * ⚠ Build appkit FIRST (`npm --prefix ./appkit run build`). This copies what
 * is on disk; it does not compile. A stale `dist` syncs silently, so the
 * mtime of `dist` is printed on every run.
 *
 * 🛑 This makes the consumer's installed copy DIVERGE from its lockfile. That
 * is the point while iterating, and a hazard afterwards: a deploy must run a
 * clean `npm ci`, or it ships whatever happened to be sitting in
 * node_modules. The script prints the lockfile version alongside the synced
 * one so the divergence is visible rather than assumed.
 */
import { existsSync, readFileSync, statSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const targets = argv.filter((a) => !a.startsWith("--"));

const repoRoot = process.cwd();
const appkitRoot = resolve(repoRoot, "appkit");
const distDir = join(appkitRoot, "dist");
const appkitPkgPath = join(appkitRoot, "package.json");

if (!existsSync(distDir)) {
  console.error("✗ appkit/dist does not exist. Build it first:");
  console.error("    npm --prefix ./appkit run build");
  process.exit(2);
}

const appkitPkg = JSON.parse(readFileSync(appkitPkgPath, "utf8"));
const distMtime = statSync(distDir).mtime.toISOString();

/** Sibling apps that consume appkit. A directory with its own package.json. */
function discoverApps() {
  const candidates = ["auth", "blogs", "events", "media", "bookkeeping"];
  return candidates
    .map((n) => join("appkit", n))
    .filter((p) => existsSync(resolve(repoRoot, p, "package.json")));
}

const list = ALL && targets.length === 0 ? discoverApps() : targets;
if (list.length === 0) {
  console.error("✗ No target given. Pass app paths, or --all.");
  process.exit(2);
}

console.log("");
console.log("  appkit source : " + appkitRoot);
console.log("  dist version  : " + appkitPkg.version);
console.log("  dist modified : " + distMtime);
console.log("");

let failed = 0;
for (const rel of list) {
  const appDir = resolve(repoRoot, rel);
  const pkgPath = join(appDir, "package.json");
  if (!existsSync(pkgPath)) {
    console.log("  ✗ " + rel + " — no package.json");
    failed++;
    continue;
  }

  const dest = join(appDir, "node_modules", "@mohasinac", "appkit");
  if (!existsSync(join(appDir, "node_modules"))) {
    console.log("  ✗ " + rel + " — no node_modules; run npm install there first");
    failed++;
    continue;
  }

  /*
   * What the LOCKFILE says, read before overwriting, so the divergence this
   * creates is stated rather than discovered later. Vercel runs `npm ci` and
   * obeys the lockfile exactly — a synced dist never reaches a deployment,
   * and believing otherwise already cost a full day of false measurements.
   */
  let lockVersion = "(no lockfile)";
  const lockPath = join(appDir, "package-lock.json");
  if (existsSync(lockPath)) {
    try {
      const lock = JSON.parse(readFileSync(lockPath, "utf8"));
      lockVersion = lock.packages?.["node_modules/@mohasinac/appkit"]?.version ?? "(not pinned)";
    } catch { lockVersion = "(unreadable)"; }
  }

  mkdirSync(dest, { recursive: true });
  // Remove the old dist outright: a merge would leave files deleted upstream
  // still present, and a stale module that no longer exists in source is the
  // hardest kind of discrepancy to see.
  rmSync(join(dest, "dist"), { recursive: true, force: true });
  cpSync(distDir, join(dest, "dist"), { recursive: true });
  cpSync(appkitPkgPath, join(dest, "package.json"));

  const marker = lockVersion === appkitPkg.version ? "same as lockfile" : "DIVERGES from lockfile " + lockVersion;
  console.log("  ✓ " + rel.padEnd(22) + " ← dist " + appkitPkg.version + "  (" + marker + ")");
}

console.log("");
console.log("  ⚠ A synced dist is LOCAL ONLY. Vercel runs `npm ci` and obeys");
console.log("    the lockfile, so publish + bump the lockfile before deploying.");
console.log("  ⚠ For Docker, set APPKIT_LOCAL=1 in .env.docker instead — the");
console.log("    Dockerfiles already carry an `appkit_local` named context.");
console.log("");
process.exit(failed > 0 ? 1 : 0);
