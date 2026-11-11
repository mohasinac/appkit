/**
 * THE AUDIT HARNESS — one scan, one report shape, one exit contract.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11: *"can you modify the check / audit flow or refactor them
 * to support any subdomain or such in the future and we do proper checks"*.
 *
 * The 30 `audit-*.mjs` scripts each re-implemented the same three things —
 * where to look, how to walk, how to report — and each got "where to look"
 * wrong in the same way: `join(__dirname, "..", "src")`, i.e. **appkit only**.
 * Measured 2026-11-11, not one of them scanned a subdomain app, so 271 source
 * files across `auth`, `blogs`, `bookkeeping`, `events` and `media` were
 * unaudited by every rule in the suite.
 *
 * Patching thirty call sites would fix today and regress the next time someone
 * writes audit number thirty-one. So the scan is centralised here, the roots
 * are DISCOVERED (see `audit-roots.mjs`), and `audit-coverage.mjs` fails the
 * suite if a script resolves its own root instead of asking for one.
 *
 * ## What an audit declares, and what it gets
 *
 * ```js
 * export default defineAudit({
 *   name: "use-client",
 *   scope: "all",                       // or "appkit" when a rule is appkit-only
 *   describe: "client-only hooks in server files",
 *   check({ file, root, content, report }) {
 *     if (BAD.test(content)) report(file, lineNo, "why this is wrong");
 *   },
 * });
 * ```
 *
 * The harness supplies the walk, the per-root grouping, the counts, the
 * differential-friendly summary and the exit code.
 *
 * ## 🛑 The exit contract
 *
 * **Exit 1 on any finding, 0 on none.** A reporting-only audit is one nobody
 * notices — this codebase has already shipped a green checker that could not
 * fail. `--report` downgrades to exit 0 for a migration in progress, and says
 * loudly that it did.
 *
 * ## 🛑 Per-root counts are always printed
 *
 * Because the honest question after widening coverage is never "how many" but
 * "how many are NEW". Printing appkit, shop and each app separately is what
 * lets a reader say "99 pre-existing, 25 newly covered" instead of reporting
 * 124 as if the change caused them.
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { auditRoots, walkSource, REPO_ROOT } from "./audit-roots.mjs";

/**
 * @typedef {object} AuditDefinition
 * @property {string} name
 * @property {"all"|"appkit"|"apps"} [scope="all"]
 * @property {string} [describe]
 * @property {RegExp} [match] Which files to read. Defaults to ts/tsx.
 * @property {(ctx: {file:string, root:string, content:string, report:Function}) => void} check
 * @property {(ctx: {roots: string[], findings: object[]}) => void} [finalize]
 */

/** Declare an audit. Returns the definition; `runAudit` executes it. */
export function defineAudit(def) {
  if (!def || typeof def.check !== "function") {
    throw new Error("defineAudit: a `check` function is required");
  }
  return { scope: "all", ...def };
}

function rootsForScope(scope) {
  switch (scope) {
    case "appkit":
      return auditRoots({ includeShop: false, includeApps: false });
    case "apps":
      return auditRoots({ includeAppkit: false, includeShop: false });
    case "all":
    default:
      return auditRoots();
  }
}

/**
 * Run an audit definition and exit with its verdict.
 *
 * @param {AuditDefinition} def
 * @param {object} [opts]
 * @param {boolean} [opts.exit=true] Set false to use the result programmatically.
 */
export function runAudit(def, opts = {}) {
  const { exit = true } = opts;
  const reportOnly =
    process.argv.includes("--report") || process.env.AUDIT_REPORT === "1";
  const roots = rootsForScope(def.scope);
  /** @type {{root:string,file:string,line:number,message:string}[]} */
  const findings = [];

  for (const root of roots) {
    for (const file of walkSource(root.src, def.match)) {
      let content;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        /* Unreadable file is not a finding — it is an environment problem. */
        continue;
      }
      def.check({
        file,
        root: root.name,
        content,
        report: (f, line, message) =>
          findings.push({
            root: root.name,
            file: relative(REPO_ROOT, f ?? file).replace(/\\/g, "/"),
            line: typeof line === "number" ? line : 0,
            message: String(message ?? ""),
          }),
      });
    }
  }

  def.finalize?.({ roots: roots.map((r) => r.name), findings });

  // ── report ───────────────────────────────────────────────────────────────
  const byRoot = {};
  for (const r of roots) byRoot[r.name] = 0;
  for (const f of findings) byRoot[f.root] = (byRoot[f.root] ?? 0) + 1;

  console.log(`\n  audit: ${def.name}${def.describe ? ` — ${def.describe}` : ""}`);
  console.log(`  roots: ${roots.map((r) => r.name).join(", ")}`);

  for (const f of findings) {
    console.log(`  • [${f.root}] ${f.file}${f.line ? `:${f.line}` : ""} — ${f.message}`);
  }

  console.log("\n  findings per root:");
  for (const [name, count] of Object.entries(byRoot)) {
    console.log(`    ${name.padEnd(14)} ${count}`);
  }
  console.log(`    ${"TOTAL".padEnd(14)} ${findings.length}`);

  const failed = findings.length > 0;
  if (failed && reportOnly) {
    console.log(
      "\n  ⚠ REPORT MODE — exiting 0 despite findings. This hides a real " +
        "failure; remove --report before trusting a green run.\n",
    );
  } else if (failed) {
    console.log("");
  } else {
    console.log("\n  clean.\n");
  }

  const code = failed && !reportOnly ? 1 : 0;
  if (exit) process.exit(code);
  return { findings, byRoot, code };
}
