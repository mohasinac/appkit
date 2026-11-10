#!/usr/bin/env node
/**
 * pii-backfill — bring STORED documents up to the PII policy the registry declares.
 *
 * ## WHY THIS EXISTS AT ALL
 *
 * Changing `security/pii-registry.ts` changes what NEW writes do and nothing
 * else. It does not encrypt rows already stored in plaintext, does not decrypt
 * rows already stored as ciphertext, and does not reindex — so a search over a
 * newly-added index silently misses every existing row. `decryptValue` passes a
 * non-`enc:v1:` string straight through, which is what makes a converging
 * migration safe and is also exactly why nobody notices the plaintext.
 *
 * This is the BACKFILL step of add -> dual-write -> backfill -> switch reads ->
 * reindex -> drop. Without it, "PII selection is configuration" is a lie.
 *
 * ## IT REPLACES TWO SCRIPTS, AND EACH HAD A DEFECT THAT MADE IT UNUSABLE
 *
 * `backfill-pii.mjs` and `backfill-blind-index.mjs` were deleted for this.
 *
 *   · BOTH called `admin.firestore()` with no database id, so BOTH always
 *     targeted `(default)` = PRODUCTION and neither read
 *     `FIREBASE_SHOP_DATABASE_ID`. Running either to repair dev-db would have
 *     written to the live shop.
 *   · `backfill-blind-index.mjs` hard-required a `firebase-admin-key.json` at
 *     the repo root. That file is gitignored, absent, and only the owner can
 *     supply it — so the script had never run once, while `seed-cli.mjs`
 *     recorded it as the safety net that would catch up the missing `users`
 *     token indices.
 *   · 🛑 `backfill-blind-index.mjs` read `doc.data()` RAW and tokenised the
 *     result, while its own header claimed it read "through the repository
 *     (which decrypts on read)". `users.email` is stored as `enc:v1:…`, so it
 *     would have written HMACs of base64 ciphertext fragments — an index that
 *     matches nothing, indistinguishable from the absent one it replaced.
 *   · `backfill-pii.mjs` carried a hand-maintained third copy of the field
 *     lists, annotated *"keep in sync when a field is added there"*. It was not
 *     in sync.
 *
 * ## 🛑 WHICH DATABASE
 *
 * `getFirestore(app, id)` from `firebase-admin/firestore`, NEVER
 * `admin.firestore(app, id)` — the positional form IGNORES the id and silently
 * returns `(default)`. Measured: `admin.firestore(app,"dev-db")` returned 20
 * users where the real dev-db had 0, and it has already written 20 documents
 * into production once. The resolved target is PRINTED before anything is read,
 * `(default)` is labelled as production, and a write to `(default)` needs
 * `--i-mean-production` on top of `--write`.
 *
 * ## 🛑 NOTHING IS LOGGED BUT COUNTS AND FIELD NAMES
 *
 * The plaintext never leaves this process: it is decrypted, tokenised, hashed,
 * and only digests and ciphertext are written. An index VALUE is
 * `HMAC(key, plaintext)` — deterministic, so printing one is an offline
 * "is this person here" oracle. No value of any kind is printed.
 *
 * ## 🛑 A DOCUMENT WHOSE CIPHERTEXT WILL NOT DECRYPT IS SKIPPED WHOLE
 *
 * `decryptPiiFields` is fail-soft: it returns "" for a value it cannot read, so
 * a caller that merged its output back would overwrite real ciphertext with an
 * empty string. This tool detects that case per document and skips the whole
 * row, counting it as `undecryptable`. Data loss on a PII column is not an
 * acceptable price for a tidier report.
 *
 * Usage (from the consumer project root):
 *   node appkit/scripts/pii-backfill.mjs                          # dry run, env database
 *   node appkit/scripts/pii-backfill.mjs --database dev-db
 *   node appkit/scripts/pii-backfill.mjs --database dev-db --write
 *   node appkit/scripts/pii-backfill.mjs --database dev-db --write --collections users,supportTickets
 *   node appkit/scripts/pii-backfill.mjs --json                   # machine-readable plan
 *
 * Flags:
 *   --database <id>        target database; defaults to FIREBASE_SHOP_DATABASE_ID
 *   --write                actually write. DRY RUN IS THE DEFAULT.
 *   --i-mean-production    required alongside --write when the target is (default)
 *   --collections <a,b>    subset of registry collections
 *   --allow-empty          a 0-document scan is an error without this
 *   --service-account <p>  key file instead of FIREBASE_ADMIN_* env vars
 *   --json                 emit the report as JSON on stdout
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createRequire, register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/*
 * The same ESM resolver hook seed-cli registers: appkit's bundler-target dist
 * emits extension-less relative imports, which Node will not resolve.
 */
register("./node-esm-loader.mjs", pathToFileURL(__dirname + "/"));

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rawArgs[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const WRITE = flag("write", false) === true;
const PROD_ACK = flag("i-mean-production", false) === true;
const ALLOW_EMPTY = flag("allow-empty", false) === true;
const AS_JSON = flag("json", false) === true;
const DATABASE_FLAG = typeof flag("database") === "string" ? flag("database") : null;
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;
const ONLY = typeof flag("collections") === "string"
  ? new Set(flag("collections").split(",").map((s) => s.trim()))
  : null;

/** Everything human-readable goes through here so `--json` emits only JSON. */
const say = (...args) => { if (!AS_JSON) console.log(...args); };

// ---------------------------------------------------------------------------
// .env.local — same loader shape as seed-cli.mjs
// ---------------------------------------------------------------------------
const repoRoot = process.cwd();
const envLocalPath = resolve(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
} else {
  console.warn(`⚠ .env.local not found at ${envLocalPath} — relying on existing process.env`);
}

const required = ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"];
const missingEnv = required.filter((k) => !process.env[k]);
if (!SERVICE_ACCOUNT_OVERRIDE && missingEnv.length > 0) {
  console.error(`✗ Missing required env vars: ${missingEnv.join(", ")}`);
  console.error("  Either set them in .env.local or pass --service-account <path-to-key.json>");
  process.exit(2);
}

/*
 * Refuse without the key rather than writing something that LOOKS migrated.
 * A run that skips encryption and reports success is the failure this whole
 * tool exists to repair.
 */
if (!/^[0-9a-fA-F]{64}$/.test((process.env.PII_ENCRYPTION_KEY ?? "").trim())) {
  console.error("✗ PII_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// firebase-admin + the appkit dist
// ---------------------------------------------------------------------------
const require = createRequire(resolve(repoRoot, "package.json"));
/*
 * 🛑 BOTH halves of the shim. `pii-encrypt.ts` reaches node:crypto through a
 * bare runtime `require("crypto")` (deliberately, so bundlers never see a
 * node builtin), and `providers/db-firebase/admin.ts` calls
 * `module.require(...)`. Without the `module` half the symptom is not an
 * import error — it is a job that logs "complete" having written nothing,
 * because every row threw `module is not defined` into a per-row catch.
 */
globalThis.require = require;
globalThis.module = { require };

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

/** Import one module out of THIS repo's appkit dist, with a usable error. */
async function fromDist(relative) {
  const path = join(__dirname, "..", "dist", relative);
  try {
    return await import(pathToFileURL(path).href);
  } catch (err) {
    console.error(
      `✗ Could not load ${relative} from appkit/dist.\n` +
        `  Tried: ${path}\n  ${err?.code ?? err?.message ?? err}\n\n` +
        "  Build appkit first:   npm --prefix ./appkit run build\n",
    );
    process.exit(2);
  }
}

/*
 * 🛑 The crypto comes from the DIST, not from a local re-implementation.
 *
 * `backfill-pii.mjs` re-implemented AES-256-GCM and the HMAC locally, on the
 * argument that the format is three lines and the dist may be stale. The cost
 * of that argument was a second encryptor and a third copy of the field
 * lists — and `encryptPiiFields`'s real behaviour is NOT three lines: it
 * handles dotted paths, `[]` array paths, idempotency on `enc:v1:`, and the
 * DERIVED `${field}Index` sibling. A backfill that understands fewer path
 * forms than the write path silently skips exactly the fields most likely to
 * have been missed.
 */
const { PII_POLICIES, piiPolicyFor, PII_POLICY_VERSION, derivedIndexFieldsFor } =
  await fromDist("security/pii-registry.js");
const { encryptPiiFields, decryptPiiFields, piiIndicesFor } =
  await fromDist("security/pii-encrypt.js");
const { buildTokensIndex, BLIND_INDEX_KEY_VERSION_FIELD, CURRENT_BLIND_INDEX_KEY_VERSION } =
  await fromDist("security/blind-index-tokens.js");

function parsePrivateKey(raw) {
  return raw?.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

if (!admin.apps.length) {
  if (SERVICE_ACCOUNT_OVERRIDE) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(readFileSync(resolve(repoRoot, SERVICE_ACCOUNT_OVERRIDE), "utf8")),
      ),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
        privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      }),
    });
  }
}

/*
 * 🛑 `--database default` (or `(default)`) names PRODUCTION EXPLICITLY.
 *
 * Without this alias the only way to audit `(default)` was to unset
 * `FIREBASE_SHOP_DATABASE_ID` in the environment — i.e. to make the dangerous
 * target the one you reach by DELETING a safety setting, and the safe one the
 * default. A read-only production audit is a thing an operator legitimately
 * needs; it should be sayable out loud rather than arrived at by subtraction.
 * Writing there still additionally requires `--i-mean-production`.
 */
const DATABASE_ID =
  DATABASE_FLAG === "default" || DATABASE_FLAG === "(default)"
    ? ""
    : (DATABASE_FLAG ?? process.env.FIREBASE_SHOP_DATABASE_ID ?? "").trim();
const db = DATABASE_ID ? getFirestore(admin.app(), DATABASE_ID) : getFirestore(admin.app());

say(`\n  project          ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);
say(`  database         ${DATABASE_ID || "(default)   ← THIS IS PRODUCTION"}`);
say(`  policy version   v${PII_POLICY_VERSION}`);
say(`  mode             ${WRITE ? "WRITING" : "DRY RUN (default) — pass --write to apply"}`);
say(`  key version      ${CURRENT_BLIND_INDEX_KEY_VERSION}\n`);

/*
 * A second, explicit acknowledgement for production. `--write` alone is one
 * word away from `--database dev-db --write`, and the recorded damage on this
 * project came from a script that believed it was on dev-db.
 */
if (WRITE && !DATABASE_ID && !PROD_ACK) {
  console.error(
    "✗ Refusing to write to (default), which is PRODUCTION.\n" +
      "  Pass --database <id> for a named database, or add --i-mean-production.",
  );
  process.exit(2);
}

const ENC_PREFIX = "enc:v1:";
const isCiphertext = (v) => typeof v === "string" && v.startsWith(ENC_PREFIX);

/** Read a possibly-dotted path. `[]` paths are not flatly readable. */
function readPath(doc, path) {
  if (path.includes("[]")) return undefined;
  if (!path.includes(".")) return doc[path];
  let cursor = doc;
  for (const segment of path.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

/** The top-level key a field path lives under — what a Firestore patch writes. */
const rootOf = (path) => path.split(/[.[]/)[0];

/**
 * Plan one document. Returns `{ patch, reasons }`, or `{ undecryptable: true }`.
 *
 * 🛑 The patch is assembled from an explicit per-field comparison rather than
 * by merging a transformed copy of the document. Merging is how a fail-soft
 * decrypt ("" for an unreadable value) turns into permanent data loss on the
 * one column that cannot be reconstructed.
 */
function planDocument(policy, raw) {
  const { fields, indexMap, tokensIndex } = policy;
  const reasons = new Set();
  const patch = {};

  /*
   * The plaintext view. Fields already in the clear pass through unchanged;
   * ciphertext is decrypted. This is also the only thing a token index can be
   * built from, and the step `backfill-blind-index.mjs` skipped.
   */
  const plain = decryptPiiFields({ ...raw }, [...fields]);

  /*
   * Fail closed on an unreadable value. A field that WAS ciphertext and is now
   * an empty string did not decrypt — wrong key, a settings-encrypted value,
   * or a corrupt row. Skip the document whole: a sibling field under the same
   * root would otherwise be written back with that "" alongside it.
   */
  for (const field of fields) {
    if (isCiphertext(readPath(raw, field)) && readPath(plain, field) === "") {
      return { undecryptable: true };
    }
  }

  // ── 1. Encrypt what is still in the clear ─────────────────────────────────
  const encrypted = encryptPiiFields(plain, [...fields]);
  for (const field of fields) {
    const before = readPath(raw, field);
    if (field.includes("[]")) {
      /*
       * An array path cannot be compared per-element from here, so the root is
       * patched whenever the encryptor changed it. `encryptPiiFields` is
       * idempotent on `enc:v1:`, so a fully-encrypted array produces an
       * identical value and the JSON compare below drops it.
       */
      const root = rootOf(field);
      if (JSON.stringify(encrypted[root]) !== JSON.stringify(raw[root])) {
        patch[root] = encrypted[root];
        reasons.add(`encrypt:${field}`);
      }
      continue;
    }
    if (typeof before === "string" && before && !isCiphertext(before)) {
      patch[rootOf(field)] = encrypted[rootOf(field)];
      reasons.add(`encrypt:${field}`);
    }
  }

  // ── 2. The DERIVED `${field}Index` siblings ───────────────────────────────
  /*
   * `encryptPiiFields` writes these on every real write, so a row missing one
   * was written by something that did not run it. They are hashed from the
   * PLAINTEXT, which is why this reads `encrypted` (built from `plain`) and
   * never the stored ciphertext.
   */
  for (const indexField of derivedIndexFieldsFor(policy)) {
    if (raw[indexField] === undefined && encrypted[indexField] !== undefined) {
      patch[indexField] = encrypted[indexField];
      reasons.add(`index:${indexField}`);
    }
  }

  // ── 3. The MAPPED index names ─────────────────────────────────────────────
  const mapped = piiIndicesFor(plain, indexMap);
  for (const [indexField, value] of Object.entries(mapped)) {
    if (raw[indexField] === undefined) {
      patch[indexField] = value;
      reasons.add(`index:${indexField}`);
    }
  }

  // ── 4. The whole-word `*TokensIndex` ──────────────────────────────────────
  if (tokensIndex) {
    const current = raw[tokensIndex.field];
    const currentKeyVersion = raw[BLIND_INDEX_KEY_VERSION_FIELD];
    /*
     * Re-written when absent OR when written by a DIFFERENT key version.
     * Rotating `PII_HMAC_KEY` invalidates every digest silently — searches
     * just stop matching, which reads as "no such user" — so the version
     * stamp is what makes a half-finished rotation detectable instead of
     * invisible.
     */
    const stale = !Array.isArray(current) || currentKeyVersion !== CURRENT_BLIND_INDEX_KEY_VERSION;
    if (stale) {
      const values = tokensIndex.from
        .map((f) => readPath(plain, f))
        .filter((v) => typeof v === "string" && v);
      if (values.length > 0) {
        const tokens = buildTokensIndex(...values);
        if (tokens.length > 0) {
          patch[tokensIndex.field] = tokens;
          patch[BLIND_INDEX_KEY_VERSION_FIELD] = CURRENT_BLIND_INDEX_KEY_VERSION;
          reasons.add(`tokens:${tokensIndex.field}`);
        }
      }
    }
  }

  /*
   * Firestore rejects an update containing `undefined` and aborts the WHOLE
   * batch. Validate here so a DRY RUN rejects a shape the real run would —
   * without this, the dry run never touches the writer and reports a clean
   * plan for writes that cannot execute.
   */
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      throw new Error(
        `patch carries undefined at "${k}" — Firestore rejects that and it ` +
          "would abort the whole batch",
      );
    }
  }

  return { patch, reasons: [...reasons] };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const report = {
  database: DATABASE_ID || "(default) — PRODUCTION",
  policyVersion: PII_POLICY_VERSION,
  keyVersion: CURRENT_BLIND_INDEX_KEY_VERSION,
  mode: WRITE ? "write" : "dry-run",
  generatedAt: new Date().toISOString(),
  collections: [],
};
let hadError = false;

const targets = PII_POLICIES.filter((p) => !ONLY || ONLY.has(p.collection));
if (ONLY) {
  for (const name of ONLY) {
    if (!piiPolicyFor(name)) {
      hadError = true;
      console.error(`✗ "${name}" is not in the PII policy registry — nothing to back fill.`);
    }
  }
}

for (const policy of targets) {
  const row = {
    collection: policy.collection,
    scanned: 0,
    changed: 0,
    undecryptable: 0,
    reasonCounts: {},
    status: "ok",
  };

  try {
    /*
     * A subcollection is not readable as a root collection — `collectionGroup`
     * is the only way to reach `conversations/*\/messages`. Reading it as a
     * root path returns zero documents, which without this branch would be
     * reported as "empty" rather than "wrong query".
     */
    const query = policy.subcollectionOf
      ? db.collectionGroup(policy.collection)
      : db.collection(policy.collection);
    const snap = await query.get();

    /*
     * `BulkWriter`, never a hand-sized `db.batch()`. A 450-delete batch over
     * fat documents dies with `INVALID_ARGUMENT: Transaction too big` — the
     * 500-op cap is not the only limit, total payload size matters — and a
     * hand-tuned batch size is a guess that breaks on the next collection.
     */
    const writer = WRITE ? db.bulkWriter() : null;

    for (const doc of snap.docs) {
      row.scanned += 1;
      const planned = planDocument(policy, doc.data());
      if (planned.undecryptable) {
        row.undecryptable += 1;
        continue;
      }
      if (Object.keys(planned.patch).length === 0) continue;

      row.changed += 1;
      for (const reason of planned.reasons) {
        row.reasonCounts[reason] = (row.reasonCounts[reason] ?? 0) + 1;
      }
      if (writer) void writer.update(doc.ref, planned.patch);
    }

    if (writer) await writer.close();

    /*
     * A scan of ZERO is indistinguishable from a wrong collection name, and it
     * prints as a clean pass — which is how a `catalogue` typo (the collection
     * is `catalogueItems`) once survived in `backfill-pii.mjs`. Empty is an
     * ERROR unless the caller says it is expected.
     */
    if (row.scanned === 0) {
      row.status = ALLOW_EMPTY ? "empty-allowed" : "empty";
      if (!ALLOW_EMPTY) {
        hadError = true;
        console.error(
          `✗ ${policy.collection}: scanned 0 documents. Either the collection name ` +
            "is wrong or it is genuinely empty — this tool cannot tell the two apart, " +
            "so it refuses to report success. Pass --allow-empty once you have confirmed it.",
        );
      }
    }
  } catch (err) {
    hadError = true;
    row.status = "error";
    row.error = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${policy.collection}: ${row.error}`);
  }

  report.collections.push(row);

  const verb = WRITE ? "updated" : "would update";
  const reasons = Object.entries(row.reasonCounts)
    .sort()
    .map(([r, n]) => `${r}×${n}`)
    .join(" ");
  say(
    `  ${policy.collection.padEnd(24)} ${String(row.scanned).padStart(5)} scanned · ` +
      `${String(row.changed).padStart(5)} ${verb}` +
      (row.undecryptable ? ` · ${row.undecryptable} UNDECRYPTABLE (skipped)` : "") +
      (reasons ? `\n  ${" ".repeat(24)} ${reasons}` : ""),
  );
}

report.totals = {
  scanned: report.collections.reduce((n, c) => n + c.scanned, 0),
  changed: report.collections.reduce((n, c) => n + c.changed, 0),
  undecryptable: report.collections.reduce((n, c) => n + c.undecryptable, 0),
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  say(
    WRITE
      ? `\n${hadError ? "✗ Completed with errors" : "✓ Done"} — ${report.totals.changed} document(s) updated.\n`
      : `\n${hadError ? "✗ Completed with errors" : "✓ Dry run"} — ${report.totals.changed} document(s) WOULD be updated. Re-run with --write.\n`,
  );
}
process.exit(hadError ? 1 : 0);
