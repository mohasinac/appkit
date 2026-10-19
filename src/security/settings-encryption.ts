// crypto is a Node.js built-in. Use require() to keep it out of the static
// import graph so Next.js Edge bundler does not warn about this file.
 
function nodeCrypto() { return require("crypto") as typeof import("crypto"); }
 

import { ENC_PREFIX, encEnvelopeKind } from "./pii-mask";

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12;
// ONE declaration of the prefix, shared with the PII system that also uses it.
// Two independent `"enc:v1:"` literals is what let the two formats drift into
// looking identical to every "is this encrypted" check in the codebase.
const PREFIX = ENC_PREFIX;

/**
 * Strip a trailing CR/LF (literal or escaped) and surrounding whitespace —
 * including a leading BOM, which `String.prototype.trim` removes.
 *
 * Mirrors `normalizePiiSecretValue` in pii-encrypt.ts rather than importing
 * it: that module is the Node-crypto half of the PII system and this file must
 * not depend on it. The two are four lines and must stay identical; the
 * UNNORMALISED_HEX_KEY rule in audit-pii-crypto is what keeps them honest.
 */
function normalizeSecretEnvValue(raw: string | undefined): string {
  return (raw ?? "").replace(/(?:\\r|\\n|\r|\n)+$/g, "").trim();
}

function getMasterKey(): Buffer {
  // Normalise before measuring AND before Buffer.from. A BOM or trailing CR
  // makes `length !== 64` true, so this threw a confusing "must be 64
  // characters" on a key that looks correct in the dashboard — and had the
  // length check not been there, Buffer.from would have truncated at the first
  // non-hex byte and produced a silently WRONG key instead.
  const hex = normalizeSecretEnvValue(process.env.SETTINGS_ENCRYPTION_KEY);
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }

  return Buffer.from(hex, "hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const { randomBytes, createCipheriv } = nodeCrypto();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptSecret(encrypted: string): string {
  if (!encrypted.startsWith(PREFIX)) {
    return encrypted;
  }

  // Name the actual problem. A PII-encrypted value reaching here used to throw
  // "expected 3 parts", which describes the symptom and not the cause — it is
  // the wrong KEY and the wrong FORMAT, not a corrupt value.
  const kind = encEnvelopeKind(encrypted);
  if (kind === "pii") {
    throw new Error(
      "Value is PII-encrypted (PII_ENCRYPTION_KEY, colon-separated), not settings-encrypted — decryptSecret cannot read it",
    );
  }

  const parts = encrypted.slice(PREFIX.length).split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value - expected 3 parts");
  }

  const [ivB64, tagB64, ciphertextB64] = parts;
  const { createDecipheriv } = nodeCrypto();
  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function isSecretEncrypted(value: string): boolean {
  return encEnvelopeKind(value) === "settings";
}

/*
 * ---------------------------------------------------------------------------
 * Binary envelope — for FILE BYTES, not strings.
 * ---------------------------------------------------------------------------
 *
 * Same algorithm, same key, same `enc:v1:` marker as the string form above, but
 * a BINARY layout rather than a dot-joined base64 triple:
 *
 *   "enc:v1:" (7 ASCII bytes) || iv (12) || authTag (16) || ciphertext
 *
 * 🛑 Why not reuse `encryptSecret` with a base64 string. Two reasons, and the
 * first one is a hard ceiling rather than a preference:
 *
 *   1. Base64 inflates by 4/3, so the 680 KB Udyam certificate becomes ~907 KB
 *      of string before the envelope is added. A Firestore document is capped
 *      at 1 MiB, so that approach is one slightly-larger PDF away from an
 *      unrecoverable write failure — and it fails at UPLOAD time, after the
 *      user has handed over the document.
 *   2. The bytes belong in Storage regardless, and Storage takes a Buffer. Round
 *      -tripping them through base64 to satisfy a string API costs 33% of the
 *      object size and every byte of it is paid again on download.
 *
 * So: metadata in Firestore, ciphertext in Storage. These two functions are the
 * seam between them.
 */

/** ASCII `enc:v1:` — the same marker the string envelope uses, as raw bytes. */
const BINARY_PREFIX = Buffer.from(PREFIX, "ascii");
const TAG_BYTES = 16;

/**
 * AES-256-GCM a file's bytes under `SETTINGS_ENCRYPTION_KEY`.
 *
 * Throws when the key is unset — deliberately, and identically to
 * `encryptSecret`. A document store that silently writes plaintext when
 * misconfigured is worse than one that refuses, because nothing downstream can
 * tell the two apart afterwards.
 */
export function encryptBuffer(plaintext: Buffer): Buffer {
  const key = getMasterKey();
  const { randomBytes, createCipheriv } = nodeCrypto();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return Buffer.concat([BINARY_PREFIX, iv, cipher.getAuthTag(), ciphertext]);
}

/**
 * Reverse `encryptBuffer`.
 *
 * 🛑 Unlike `decryptSecret`, a buffer with no `enc:v1:` prefix is REJECTED
 * rather than passed through. That asymmetry is intentional. `decryptSecret`
 * tolerates plaintext because the settings collection genuinely holds
 * unencrypted placeholders that predate encryption, so passing them through is
 * the migration path. Here there is no such legacy: every object this reads was
 * written by `encryptBuffer`, so an unprefixed buffer means the wrong object,
 * a truncated download, or an upload that bypassed encryption — and returning
 * it verbatim would serve one of those to an admin as though it were fine.
 *
 * GCM authentication also means `final()` throws on any tampering or on the
 * wrong key, so a corrupted object fails loudly instead of yielding garbage.
 */
export function decryptBuffer(encrypted: Buffer): Buffer {
  if (!isBufferEncrypted(encrypted)) {
    // Interpolates PREFIX rather than writing "enc:v1:" a second time —
    // audit-pii-crypto's ENC_PREFIX_REDECLARED rule exists because two
    // independent copies of that literal are how two incompatible formats
    // came to look identical to every "is this encrypted" check.
    throw new Error(
      `Buffer is not settings-encrypted — expected a '${PREFIX}' binary envelope`,
    );
  }

  const ivStart = BINARY_PREFIX.length;
  const tagStart = ivStart + IV_BYTES;
  const dataStart = tagStart + TAG_BYTES;

  const { createDecipheriv } = nodeCrypto();
  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    encrypted.subarray(ivStart, tagStart),
  );
  decipher.setAuthTag(encrypted.subarray(tagStart, dataStart));

  return Buffer.concat([
    decipher.update(encrypted.subarray(dataStart)),
    decipher.final(),
  ]);
}

/**
 * True when `buf` carries the binary envelope AND is long enough to hold a
 * complete one.
 *
 * The length check is not pedantry: without it a 7-byte buffer containing only
 * the prefix passes, and `decryptBuffer` then hands `createDecipheriv` a
 * zero-length IV, which throws `Invalid initialization vector` — an error that
 * describes the crypto call rather than the truncated download that caused it.
 */
export function isBufferEncrypted(buf: Buffer): boolean {
  return (
    buf.length > BINARY_PREFIX.length + IV_BYTES + TAG_BYTES &&
    buf.subarray(0, BINARY_PREFIX.length).equals(BINARY_PREFIX)
  );
}

export function maskSecret(value: string): string {
  if (!value || value.length < 12) {
    return "****";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
