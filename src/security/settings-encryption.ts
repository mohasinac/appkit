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

export function maskSecret(value: string): string {
  if (!value || value.length < 12) {
    return "****";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
