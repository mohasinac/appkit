/**
 * PII Encryption Utilities — AES-256-GCM with HMAC-SHA256 blind indexes.
 *
 * Environment variables required (server-side only):
 *   PII_ENCRYPTION_KEY — 32-byte hex string (64 chars) for AES-256-GCM
 *   PII_HMAC_KEY       — 32-byte hex string (64 chars) for HMAC-SHA256
 *                        (defaults to PII_ENCRYPTION_KEY if absent)
 *
 * Ciphertext format: "enc:v1:<iv_b64>:<ciphertext_b64>:<authtag_b64>"
 * Blind index format: "hmac-sha256:<sha256_hex>"
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
} from "crypto";

const ALGO = "aes-256-gcm";
export const ENC_PREFIX = "enc:v1:";
export const HMAC_PREFIX = "hmac-sha256:";

function getEncKey(): Buffer {
  const raw = process.env["PII_ENCRYPTION_KEY"] ?? "";
  if (!raw)
    throw new Error(
      "PII_ENCRYPTION_KEY env var is not set — cannot encrypt PII fields",
    );
  return Buffer.from(raw, "hex");
}

function getHmacKey(): Buffer {
  const raw =
    process.env["PII_HMAC_KEY"] ?? process.env["PII_ENCRYPTION_KEY"] ?? "";
  if (!raw)
    throw new Error(
      "PII_HMAC_KEY env var is not set — cannot generate blind PII index",
    );
  return Buffer.from(raw, "hex");
}

/** Encrypt a plaintext string with AES-256-GCM. */
export function encryptValue(plaintext: string): string {
  const key = getEncKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

/** Decrypt an AES-256-GCM ciphertext produced by `encryptValue`. */
export function decryptValue(ciphertext: string): string {
  if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext;
  const inner = ciphertext.slice(ENC_PREFIX.length);
  const parts = inner.split(":");
  if (parts.length !== 3)
    throw new Error(`Invalid PII ciphertext: ${ciphertext}`);
  const [ivB64, encB64, tagB64] = parts as [string, string, string];
  const key = getEncKey();
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Produce a deterministic HMAC-SHA256 blind index for a PII value.
 * Used for equality lookups without decrypting (e.g. find-by-email).
 */
export function hmacBlindIndex(value: string): string {
  const key = getHmacKey();
  const hash = createHmac("sha256", key).update(value).digest("hex");
  return `${HMAC_PREFIX}${hash}`;
}

/**
 * Encrypt specified PII fields in a Firestore document.
 * For each encrypted field, a `<field>Index` blind-index sibling is added.
 * Already-encrypted values (prefix `enc:v1:`) are left unchanged.
 */
export function encryptPiiFields<T extends Record<string, unknown>>(
  doc: T,
  piiFields: string[],
): T {
  const result = { ...doc } as Record<string, unknown>;
  for (const field of piiFields) {
    const value = doc[field];
    if (typeof value !== "string" || !value) continue;
    if (value.startsWith(ENC_PREFIX)) continue; // already encrypted
    result[field] = encryptValue(value);
    result[`${field}Index`] = hmacBlindIndex(value);
  }
  return result as T;
}

/**
 * Decrypt specified PII fields in a Firestore document.
 * Fields that are not encrypted (no `enc:v1:` prefix) are passed through.
 */
export function decryptPiiFields<T extends Record<string, unknown>>(
  doc: T,
  piiFields: string[],
): T {
  const result = { ...doc } as Record<string, unknown>;
  for (const field of piiFields) {
    const value = doc[field];
    if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
      result[field] = decryptValue(value);
    }
  }
  return result as T;
}
