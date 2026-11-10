#!/usr/bin/env node
/**
 * audit-pii-registry — does the PII registry still match the repositories?
 *
 * ## WHY
 *
 * `security/pii-registry.ts` is the ONE place that says which fields are PII.
 * Sixteen of its entries import the real `*_PII_FIELDS` constant, so the
 * compiler guarantees they agree. **Five do not.** Those five declare their
 * field list inline in the repository (`piiFields = ["ownerEmail"] as const`)
 * or in a feature schema `security/` must not import — `security/` sits below
 * `features/`, and importing upward would drag a dozen feature graphs into
 * every consumer that needs one string. They are copied by hand.
 *
 * A hand-copied list is exactly the drift that produced both defects this
 * registry was extracted to fix. So it is POLICED rather than annotated:
 *
 *   R1  every `transcribed` policy matches the source list it names
 *   R2  every repository declaring `piiFields` has a registry entry — the
 *       forward guard, which catches a NEW collection nobody registered
 *   R3  every `constant` policy really does import its constant (nobody
 *       downgraded a checked entry to a copied one without saying so)
 *   R4  every `explicit-call` policy carries an `enforcementException` saying
 *       WHY it cannot use the declarative hook — the weak-enforcement guard
 *
 * 🛑 R4 exists because `explicit-call` used to PASS SILENTLY. Six collections
 * encrypted from hand-written calls at their write sites, this audit printed
 * each as an informational note, and a clean run looked clean. Opt-in-per-method
 * encryption is the arrangement that left `sessions.deviceInfo.ip` in plaintext,
 * so it is no longer a style one may choose by accident: five of the six moved
 * to a hook on 2026-11-11, and the one that genuinely cannot (`messages` is a
 * SUBCOLLECTION, which neither hook can address) has to argue for itself in the
 * registry. A note nobody has to write is a note nobody reads.
 *
 * 🛑 R2 is the one that matters most and is the one no type could give you.
 * Adding `piiFields` to a repository makes new writes encrypt; it does NOT
 * make the seeder encrypt, the backfill cover it, or the CMS report it. Those
 * read the registry. A collection in the repository and not in the registry is
 * the silent half-wiring this project has now hit seven times.
 *
 * Usage:  node appkit/scripts/audit-pii-registry.mjs
 * Exit:   0 = clean, 1 = violations, 2 = could not run
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPKIT = join(__dirname, "..");
const SRC = join(APPKIT, "src");

let registry;
try {
  registry = await import(pathToFileURL(join(APPKIT, "dist", "security", "pii-registry.js")).href);
} catch (err) {
  console.error(
    "✗ Could not load appkit/dist/security/pii-registry.js — build appkit first.\n" +
      `  ${err?.code ?? err?.message ?? err}`,
  );
  process.exit(2);
}
const { PII_POLICIES } = registry;

// ---------------------------------------------------------------------------
// Walk src once, collecting what we need to compare against.
// ---------------------------------------------------------------------------
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === "seed") continue;
      walk(path);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(path);
    }
  }
})(SRC);

/**
 * 🛑 Strip comments BEFORE parsing anything.
 *
 * These field lists are documented at the line — `ORDER_PII_FIELDS` carries
 * ~50 lines of block comment between its entries, and one of those comments
 * contains a `]`. A naive `\[[^\]]*\]` therefore captured half the list plus a
 * sentence of prose and reported a drift that did not exist. The first version
 * of this audit did exactly that.
 */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Read a bracket-balanced `[ … ]` starting at `from`, then pull the string
 * literals out of it.
 *
 * Balanced, not first-`]`: `deliveryAmendments[].fullName` is a legitimate
 * ENTRY in one of these lists, so the list's own closing bracket is not the
 * first one encountered. That is the array-path notation `encryptPiiFields`
 * implements, and getting it wrong makes the longest, most sensitive list in
 * the codebase the one this audit cannot read.
 */
function readArrayAt(text, from) {
  const start = text.indexOf("[", from);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Pull the string literals out of an array literal, in order. */
function parseStringArray(literal) {
  const out = [];
  for (const m of literal.matchAll(/"([^"]*)"|'([^']*)'/g)) out.push(m[1] ?? m[2]);
  return out;
}

/** `export const NAME = [ ... ]` / `const NAME: string[] = [ ... ]` in src. */
const exportedArrays = new Map();
/** `class X extends BaseRepository<...>` -> `{ file, piiFieldsExpr }`. */
const repoDeclarations = new Map();
/** file (relative) -> the `encryptPiiFields(..., [...SYMBOL])` symbols it uses. */
const explicitEncryptors = new Map();
/**
 * file (relative) -> its comment-stripped source.
 *
 * 🛑 Comment-stripped is load-bearing for the `provider-hook` check below: the
 * registry entry and the enforcer BOTH carry long explanatory comments naming
 * `piiPolicyFor` and `applyWriteHooks`, so a raw-text scan would pass on the
 * prose alone and keep passing after the code was deleted.
 */
const sourceByRel = new Map();

for (const rawFile of files) {
  const raw = readFileSync(rawFile, "utf8");
  const text = stripComments(raw);
  /*
   * Relative to `src/`, not to the package root. The registry's `enforcedIn`
   * is written the way every other appkit path is written in source comments
   * (`features/seller/repository/offer.repository.ts`), and a key mismatch
   * here reports every explicit-call collection as unverified — a false
   * failure, which is the one result an audit must never produce.
   */
  const rel = relative(SRC, rawFile).replace(/\\/g, "/");
  sourceByRel.set(rel, text);

  /*
   * `export const` AND a bare `const` — `NEWSLETTER_PII_FIELDS` is
   * module-local by design (its exported twin was deleted for reading as
   * proof of coverage while doing nothing), so an export-only scan cannot
   * verify the one collection whose list deliberately is not exported.
   */
  for (const m of text.matchAll(/(?:export\s+)?const ([A-Z0-9_]+)(?:\s*:\s*[^=]+)?\s*=\s*\[/g)) {
    /*
     * 🛑 Read the array from the `=`, not from the match start. A TYPE
     * ANNOTATION can contain brackets — `const NEWSLETTER_PII_FIELDS:
     * string[] = ["email"]` — and starting at the match meant the first `[`
     * found was the one in `string[]`, which parses as an EMPTY list. The
     * symbol then "resolved" to zero fields and the audit reported a drift on
     * the one collection whose list is deliberately module-local.
     */
    const literal = readArrayAt(text, text.indexOf("=", m.index));
    if (literal) exportedArrays.set(m[1], parseStringArray(literal));
  }

  /*
   * The `explicit-call` enforcement style: `encryptPiiFields(x, [...SYMBOL])`.
   * Recorded per FILE, because these are module-level helpers as often as
   * methods (`messages.repository.ts` encrypts from two free functions).
   */
  /*
   * 🛑 Not `encryptPiiFields\([^)]*?\[\.\.\.(SYMBOL)\]`. Both halves of that
   * pattern were wrong against real code:
   *   · `[^)]` stops at the first `)`, and one call site casts its argument
   *     with `data as unknown as import("@mohasinac/appkit").FirestoreDocument`
   *     — a `)` inside the FIRST argument.
   *   · the second argument is not always spread. `NewsletterRepository`
   *     passes the symbol directly, because its list is typed `string[]`
   *     rather than `as const` and needs no copy.
   * So: scan a bounded window after the call and take any UPPER_SNAKE token
   * that resolves to a known array literal. Bounded, so a missing close paren
   * cannot make this match the whole file.
   */
  for (const m of text.matchAll(/encryptPiiFields\(/g)) {
    const window = text.slice(m.index, m.index + 400);
    for (const sym of window.matchAll(/\b([A-Z][A-Z0-9_]{3,})\b/g)) {
      if (!explicitEncryptors.has(rel)) explicitEncryptors.set(rel, new Set());
      explicitEncryptors.get(rel).add(sym[1]);
    }
  }

  /*
   * One pass per class body. `piiFields` is `protected override`, so the
   * declaration always sits inside a class — and a file can hold several
   * repositories (`token.repository.ts` holds two, `store-extensions` three),
   * which is why the class name has to come from the nearest preceding
   * `class` keyword rather than from the filename.
   */
  const classPositions = [...text.matchAll(/class\s+(\w+)\s+extends\s+BaseRepository/g)].map(
    (m) => ({ name: m[1], at: m.index }),
  );
  for (const m of text.matchAll(/piiFields\s*=\s*([^;]+);/g)) {
    const owner = [...classPositions].reverse().find((c) => c.at < m.index);
    if (!owner) continue;
    /*
     * The right-hand side may itself be a multi-line array literal
     * (`SessionRepository` declares its three nested paths inline), and the
     * `[^;]+` capture stops at the first `;` — which is correct for an array
     * of strings but not for one containing a `;`. Re-read it balanced when it
     * opens a bracket, so the inline and the by-symbol forms agree.
     */
    const expr = m[1].trim();
    const balanced = expr.startsWith("[") ? readArrayAt(text, m.index) : null;
    repoDeclarations.set(owner.name, { file: rel, expr: balanced ?? expr });
  }
}

/** Resolve a `piiFields = …` right-hand side to a field list, or null. */
function resolveExpr(expr) {
  const bare = expr.replace(/\s+as\s+const\s*$/, "").trim();
  if (bare.startsWith("[")) return { fields: parseStringArray(bare), kind: "inline" };
  if (/^[A-Z0-9_]+$/.test(bare)) {
    const resolved = exportedArrays.get(bare);
    return resolved ? { fields: resolved, kind: "constant", symbol: bare } : null;
  }
  return null;
}

const violations = [];
/** Things worth stating that are not defects. Printed, never counted as pass/fail. */
const notes = [];
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ── R1 / R3 — every policy agrees with its repository ──────────────────────
for (const policy of PII_POLICIES) {
  const enforcement = policy.enforcement ?? "write-hook";

  /*
   * ── `explicit-call` collections ────────────────────────────────────────
   *
   * Five collections never declare `piiFields` at all — they call
   * `encryptPiiFields(x, [...SYMBOL])` at their write sites. That is a REAL
   * wiring, so reporting them as unverified would be a false alarm; but it is
   * a WEAKER one, because it is opt-in per method, so the audit verifies the
   * symbol and then says so out loud.
   */
  if (enforcement === "explicit-call") {
    const symbols = explicitEncryptors.get(policy.enforcedIn ?? "") ?? new Set();
    const matched = [...symbols].find((sym) => {
      const list = exportedArrays.get(sym);
      return list && same([...policy.fields], list);
    });
    if (!matched) {
      violations.push({
        rule: "R1",
        severity: "error",
        message:
          `${policy.collection}: declared enforcement:"explicit-call" in ` +
          `${policy.enforcedIn ?? "(no enforcedIn set)"}, but no ` +
          "`encryptPiiFields(…, [...SYMBOL])` there resolves to the registry's field list " +
          `[${policy.fields.join(", ")}]. Found: ${[...symbols].join(", ") || "nothing"}.`,
      });
    }

    /*
     * ── R4 — a weaker enforcement must be a DECLARED exception ────────────
     *
     * The wiring being real (R1 above) is not the whole question. Opt-in
     * per-method encryption means a NEW write path is unencrypted by default
     * and nothing fails, so choosing it needs a structural reason recorded in
     * the registry — not a note this script writes on the author's behalf.
     */
    if (!policy.enforcementException) {
      violations.push({
        rule: "R4",
        severity: "error",
        message:
          `${policy.collection}: enforcement:"explicit-call" with no ` +
          "`enforcementException`. Per-method encryption leaves every NEW write " +
          "path unencrypted by default, so it is a declared exception, not a " +
          "default. Either move it onto `piiFields` (the write hook) or onto the " +
          "generic provider hook, or record WHY neither is possible.",
      });
    } else if (matched) {
      notes.push(
        `${policy.collection}: DECLARED EXCEPTION — encrypted by an explicit call ` +
          `(${matched} in ${policy.enforcedIn}) rather than a hook. Reason: ` +
          policy.enforcementException,
      );
    }
    continue;
  }

  /*
   * ── `provider-hook` collections ──────────────────────────────────────────
   *
   * Reached through `IDbProvider.getRepository(name)`, i.e. the GENERIC
   * `FirebaseRepository`. There is no per-collection subclass to declare
   * `piiFields` on, so THIS REGISTRY is the declaration: the generic
   * repository resolves the policy by collection name inside its own
   * `applyWriteHooks`. Enforcement is as total as `write-hook`.
   *
   * What is verified is that the named module really does resolve the policy
   * from here — a `provider-hook` entry whose enforcer stopped reading the
   * registry would be a policy with no writer at all, which is the shape of
   * the defect that made the generic repository's own docstring false for
   * months (it promised `applyWriteHooks` and had none).
   */
  if (enforcement === "provider-hook") {
    const enforcer = policy.enforcedIn ?? "";
    const text = sourceByRel.get(enforcer);
    if (!text) {
      violations.push({
        rule: "R1",
        severity: "error",
        message:
          `${policy.collection}: enforcement:"provider-hook" names ` +
          `${enforcer || "(no enforcedIn set)"}, which is not a file under appkit/src.`,
      });
    } else if (!/piiPolicyFor\s*\(/.test(text) || !/applyWriteHooks/.test(text)) {
      violations.push({
        rule: "R1",
        severity: "error",
        message:
          `${policy.collection}: ${enforcer} is declared as the provider hook but does ` +
          "not both call `piiPolicyFor(...)` and define `applyWriteHooks`. A policy " +
          "whose enforcer no longer reads this registry has NO writer.",
      });
    } else {
      notes.push(
        `${policy.collection}: encrypted by the GENERIC provider repository ` +
          `(${enforcer}), which resolves this registry by collection name — there is ` +
          "no per-collection subclass to declare `piiFields` on. ⚠ No `*TokensIndex` " +
          "is written on that path; it needs a buildTokensIndexFor() override.",
      );
    }
    continue;
  }

  const decl = repoDeclarations.get(policy.repository);

  if (!decl) {
    violations.push({
      rule: "R1",
      severity: "error",
      message:
        `${policy.collection}: no \`piiFields\` declaration found for ${policy.repository} ` +
        "in appkit/src, and no explicit-call enforcement is declared — the registry entry " +
        "cannot be verified against source. An unverifiable entry is not a clean one.",
    });
    continue;
  }

  const resolved = resolveExpr(decl.expr);
  if (!resolved) {
    violations.push({
      rule: "R1",
      severity: "error",
      message:
        `${policy.collection}: could not resolve \`piiFields = ${decl.expr}\` in ${decl.file}. ` +
        "An unresolvable declaration is reported, never assumed correct.",
    });
    continue;
  }

  if (!same([...policy.fields], resolved.fields)) {
    violations.push({
      rule: "R1",
      severity: "error",
      message:
        `${policy.collection}: DRIFT. registry=[${policy.fields.join(", ")}] ` +
        `but ${policy.repository} declares [${resolved.fields.join(", ")}] (${decl.file}).`,
    });
    continue;
  }

  /*
   * R3 — a policy marked `constant` must really resolve through an importable
   * symbol. Downgrading one to an inline array without flipping `fieldSource`
   * would silently remove it from this audit's transcribed set, i.e. make it
   * LESS checked while looking more checked.
   */
  if (policy.fieldSource === "constant" && resolved.kind !== "constant") {
    violations.push({
      rule: "R3",
      severity: "error",
      message:
        `${policy.collection}: marked fieldSource:"constant" but ${policy.repository} ` +
        `declares an inline array in ${decl.file}. Either restore the constant or mark ` +
        "the policy `transcribed` so this audit keeps checking it by hand.",
    });
  }
  if (policy.fieldSource === "transcribed" && resolved.kind === "constant") {
    /*
     * A NOTE, not a warning. `SUPPORT_TICKET_PII_FIELDS` is exported — but
     * from `features/support/schemas/firestore.ts`, and `security/` sits
     * BELOW `features/`. Importing upward would pull a feature schema graph
     * into the universal barrel for one string. The transcription is the
     * lesser cost, and R1 above has just proved it correct byte for byte,
     * which is the whole reason this audit exists. A permanent warning with
     * a good reason is how a team learns to ignore warnings.
     */
    notes.push(
      `${policy.collection}: field list TRANSCRIBED from ${resolved.symbol}, which is ` +
        "importable but lives above `security/` in the layering. Verified equal here, " +
        "so the copy is policed rather than trusted.",
    );
  }
}

// ── R2 — the forward guard ─────────────────────────────────────────────────
const registeredRepos = new Set(PII_POLICIES.map((p) => p.repository));
for (const [repo, decl] of repoDeclarations) {
  if (registeredRepos.has(repo)) continue;
  const resolved = resolveExpr(decl.expr);
  /* An empty list encrypts nothing and needs no policy. */
  if (resolved && resolved.fields.length === 0) continue;
  violations.push({
    rule: "R2",
    severity: "error",
    message:
      `${repo} declares piiFields=[${resolved?.fields.join(", ") ?? decl.expr}] in ${decl.file} ` +
      "but has NO entry in PII_POLICIES. New writes will encrypt; the seeder, the " +
      "backfill tool and the PII CMS will all skip it.",
  });
}

// ---------------------------------------------------------------------------
const errors = violations.filter((v) => v.severity === "error");
const warns = violations.filter((v) => v.severity === "warn");

console.log(
  `\npii-registry audit — ${PII_POLICIES.length} policies, ` +
    `${repoDeclarations.size} repositories declaring piiFields\n`,
);
for (const v of errors) console.log(`  ✗ [${v.rule}] ${v.message}`);
for (const v of warns) console.log(`  ⚠ [${v.rule}] ${v.message}`);
if (violations.length === 0) console.log("  ✓ registry and repositories agree");
else console.log(`\n  ${errors.length} error(s), ${warns.length} warning(s)`);
/*
 * Notes print AFTER the verdict and are never counted. They record facts an
 * operator should know — which collections rely on the weaker `explicit-call`
 * enforcement, and which field lists are transcribed-but-verified — without
 * teaching anyone that a clean run still has findings to scroll past.
 */
if (notes.length > 0) {
  console.log("\n  notes (not defects):");
  for (const n of notes) console.log(`    · ${n}`);
}
console.log("");

process.exit(errors.length > 0 ? 1 : 0);
