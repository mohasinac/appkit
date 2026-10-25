#!/usr/bin/env node
/**
 * The audit gate, run before a publish.
 *
 * 🛑 ADDED 2026-10-25 on the owner's instruction — *"before publish or deploy we
 * do the audits"* — and because publish was the half that had NO gate at all.
 * `prepublishOnly` ran `npm run build` and nothing else, so a tarball could ship
 * with every audit red. The deploy side was already covered:
 * `scripts/deploy.mjs` runs `npm run check` before uploading and smoke-tests
 * production afterwards.
 *
 * A publish is the right boundary precisely because it is irreversible in a way
 * a commit is not: an npm version cannot be unpublished after 72 hours, the
 * consumer resolves it by range, and `dist/.build-stamp.json` SHIPS inside the
 * tarball — so a bad publish is visible to every consumer and costs another
 * version to correct.
 *
 * 🛑 It DEGRADES rather than blocking spuriously, and that is not laziness.
 * The audits live in the CONSUMER repo (`../scripts/run-audits.mjs`), but appkit
 * is also published from a standalone clone — `project_appkit_git_topology`
 * records that main's appkit is exactly that, and there is a second checkout at
 * `D:/proj/appkit-build/appkit`. A gate that assumed `..` was the consumer would
 * fail the publish for an environmental reason that reads as a code problem,
 * which is the failure mode this repo has paid for repeatedly. So: if the runner
 * is not reachable, say so loudly and continue.
 *
 * Bypass: SKIP_HOOKS=1 npm publish   (the same lever as the git hooks)
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

if (process.env.SKIP_HOOKS === "1") {
  console.log("[prepublish-gate] skipped (SKIP_HOOKS=1)");
  process.exit(0);
}

const consumerRoot = path.resolve(import.meta.dirname, "..", "..");
/*
 * 🛑 fast-gate, NOT `run-audits.mjs --all`. Same 242 audits, but fast-gate runs
 * them through a worker pool at `cpus-2` — ~110s against ~7 minutes sequential.
 * A publish gate that costs seven minutes is one people start bypassing, which
 * defeats the point of adding it. fast-gate also prints its own denominator, so
 * a filtered subset can never be mistaken for the whole suite.
 */
const runner = path.join(consumerRoot, "scripts", "fast-gate.mjs");

if (!existsSync(runner)) {
  console.log(
    `[prepublish-gate] SKIPPED — no audit runner at ${runner}\n` +
      "  appkit is being published from a standalone clone rather than from inside the\n" +
      "  consumer repo, so the audits are not reachable. This is not a failure; it is\n" +
      "  the topology. Run `npm run check` in the consumer checkout before publishing.",
  );
  process.exit(0);
}

console.log("[prepublish-gate] running the consumer's audit suite before publish …");
try {
  execFileSync(process.execPath, [runner], {
    cwd: consumerRoot,
    stdio: "inherit",
  });
} catch {
  console.error(
    "\n[prepublish-gate] ✗ audits failed — publish aborted.\n" +
      "  An npm version cannot be unpublished after 72 hours, and the consumer resolves\n" +
      "  it by range, so a bad tarball costs another version to correct.\n" +
      "  Fix the failures, or SKIP_HOOKS=1 npm publish with a reason.",
  );
  process.exit(1);
}
console.log("[prepublish-gate] ✓ audits clean — proceeding to build + publish");
