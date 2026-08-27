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

import type { FirestoreValue } from "../schemas/types";
import { ENC_PREFIX, HMAC_PREFIX, isPiiEncrypted } from "./pii-mask";

// Re-exported for backward-compat with existing direct imports of these
// symbols from this file — the actual crypto-free definitions live in
// pii-mask.ts (see that file's header comment for why the split exists).
export { ENC_PREFIX, HMAC_PREFIX, isPiiEncrypted };

// crypto is a Node.js built-in. A bare, non-static `require(...)` call
// (never a top-level `import ... from "node:module"`/"crypto") is
// deliberate: bundlers targeting the browser (Turbopack in particular)
// statically resolve every top-level import in a module's chain before any
// tree-shaking pass, and hard-fail immediately on an unresolvable Node
// builtin even if the symbol using it is never actually consumed
// client-side. A bare `require` reference inside a function body is a
// runtime lookup, not a static import, so it's invisible to that pass.
// This only works where an ambient `require` global exists: Next.js's own
// server bundle (webpack/Turbopack) provides one automatically; the one
// place that doesn't is a standalone pure-ESM script importing
// @mohasinac/appkit directly (appkit/scripts/seed-cli.mjs), which sets
// `globalThis.require` itself before importing appkit — see that file.
function nodeCrypto() { return require("crypto") as typeof import("crypto"); }

const ALGO = "aes-256-gcm";

function normalizePiiSecretValue(raw: string | undefined): string {
  return (raw ?? "").replace(/(?:\\r|\\n|\r|\n)+$/g, "").trim();
}

export function getPiiConfigError(): string | null {
  const hex = normalizePiiSecretValue(process.env.PII_ENCRYPTION_KEY);
  if (!hex || hex.length !== 64) {
    return (
      "PII_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate with: node -e \"require('crypto').randomBytes(32).toString('hex')\""
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return "PII_ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f).";
  }

  return null;
}

function getEncKey(): Buffer {
  const configError = getPiiConfigError();
  if (configError) throw new Error(configError);
  const hex = normalizePiiSecretValue(process.env.PII_ENCRYPTION_KEY);
  return Buffer.from(hex, "hex");
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
  const { randomBytes, createCipheriv } = nodeCrypto();
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
  const { createDecipheriv } = nodeCrypto();
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
  const { createHmac } = nodeCrypto();
  const key = getHmacKey();
  const hash = createHmac("sha256", key).update(value).digest("hex");
  return `${HMAC_PREFIX}${hash}`;
}

/**
 * Encrypt specified PII fields in a Firestore document.
 * For each encrypted field, a `<field>Index` blind-index sibling is added.
 * Already-encrypted values (prefix `enc:v1:`) are left unchanged.
 */
/** Read `a.b.c`, returning undefined if any hop is missing or not an object. */
function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Set `a.b.c`, cloning each object along the path so the input is untouched. */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop() as string;
  let cursor: Record<string, unknown> = obj;
  for (const key of keys) {
    const next = cursor[key];
    if (next === null || typeof next !== "object") return;
    cursor[key] = { ...(next as Record<string, unknown>) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[last] = value;
}

/**
 * Encrypt the named fields, adding a blind index alongside each top-level one.
 *
 * Supports dotted paths (`deviceInfo.ip`, `whatsappConfig.accessToken`). This
 * was a flat top-level loop that skipped anything non-string, which is why
 * nested PII stayed in plaintext — and why the exported
 * `STORE_SECRET_FIELDS = ["whatsappConfig.accessToken"]` was unusable by the
 * very function it was written for.
 *
 * Idempotent: a value already carrying `enc:v1:` is left alone, so re-running
 * over a partially-migrated document is safe.
 */
/**
 * Encrypt `itemPath` on every element of the array at `arrayPath`.
 *
 * Spelled `messages[].body` in a PII field list. Without this, array-of-object
 * PII — conversation message bodies, status-history notes — is written in
 * plaintext and `mapDoc`'s decrypt never touches it on the way back out: a leak
 * with no error and no visible symptom.
 */
function encryptInArray(
  root: Record<string, unknown>,
  arrayPath: string,
  itemPath: string,
): void {
  const arr = getPath(root, arrayPath);
  if (!Array.isArray(arr)) return;

  const next = arr.map((el) => {
    if (el === null || typeof el !== "object") return el;
    const clone = { ...(el as Record<string, unknown>) };
    const value = itemPath ? getPath(clone, itemPath) : undefined;
    if (typeof value !== "string" || !value || value.startsWith(ENC_PREFIX)) {
      return clone;
    }
    setPath(clone, itemPath, encryptValue(value));
    return clone;
  });

  setPath(root, arrayPath, next);
}

export function encryptPiiFields<T extends object>(
  doc: T,
  piiFields: string[],
): T {
  const result = { ...doc } as Record<string, FirestoreValue>;
  for (const field of piiFields) {
    // `messages[].body` — encrypt one property on every element of an array.
    if (field.includes("[]")) {
      const [arrayPath, rest] = field.split("[]");
      encryptInArray(
        result as Record<string, unknown>,
        arrayPath,
        rest.replace(/^\./, ""),
      );
      continue;
    }

    const nested = field.includes(".");
    const value = nested
      ? getPath(result as Record<string, unknown>, field)
      : (result as Record<string, unknown>)[field];

    if (typeof value !== "string" || !value) continue;
    if (value.startsWith(ENC_PREFIX)) continue; // already encrypted

    if (nested) {
      // Blind index deliberately omitted for nested paths: `deviceInfo.ipIndex`
      // would be a nested sibling nothing queries, and an index only earns its
      // storage when some lookup actually uses it.
      setPath(result as Record<string, unknown>, field, encryptValue(value));
    } else {
      result[field] = encryptValue(value);
      result[`${field}Index`] = hmacBlindIndex(value);
    }
  }
  return result as T;
}

/**
 * Decrypt specified PII fields in a Firestore document.
 * Fields that are not encrypted (no `enc:v1:` prefix) are passed through.
 */
export function decryptPiiFields<T extends object>(
  doc: T,
  piiFields: string[],
): T {
  const result = { ...doc } as Record<string, FirestoreValue>;

  for (const field of piiFields) {
    // MUST mirror encryptPiiFields' path handling. This was a flat top-level
    // loop while encrypt understood dotted and array paths — so a nested field
    // would be encrypted on write and never decrypted on read, surfacing
    // ciphertext to callers. Any path form added to one must be added to both.
    if (field.includes("[]")) {
      const [arrayPath, rest] = field.split("[]");
      const itemPath = rest.replace(/^\./, "");
      const arr = getPath(result as Record<string, unknown>, arrayPath);
      if (!Array.isArray(arr)) continue;

      setPath(
        result as Record<string, unknown>,
        arrayPath,
        arr.map((el) => {
          if (el === null || typeof el !== "object") return el;
          const clone = { ...(el as Record<string, unknown>) };
          const value = itemPath ? getPath(clone, itemPath) : undefined;
          if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
            setPath(clone, itemPath, decryptValue(value));
          }
          return clone;
        }),
      );
      continue;
    }

    if (field.includes(".")) {
      const value = getPath(result as Record<string, unknown>, field);
      if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
        setPath(result as Record<string, unknown>, field, decryptValue(value));
      }
      continue;
    }

    const value = result[field];
    if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
      result[field] = decryptValue(value);
    }
  }

  return result as T;
}

// --- Aliases for compatibility with existing code ---------------------------

/** Alias for encryptValue — encrypts a PII plaintext string. */
export function encryptPii(
  plaintext: string | null | undefined,
): string | null | undefined {
  if (!plaintext || typeof plaintext !== "string") return plaintext;
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext; // idempotent
  return encryptValue(plaintext);
}

/** Alias for decryptValue — decrypts a PII ciphertext. */
export function decryptPii(
  ciphertext: string | null | undefined,
): string | null | undefined {
  if (!ciphertext || typeof ciphertext !== "string") return ciphertext;
  return decryptValue(ciphertext);
}

/** Alias for hmacBlindIndex. */
export function piiBlindIndex(plaintext: string): string {
  return hmacBlindIndex(plaintext);
}

/**
 * Add blind-index fields to an object.
 * For each mapping entry (e.g. { email: "emailIndex" }), if the source field
 * is a non-empty string, computes the HMAC and stores it as the index field.
 */
/**
 * Blind-index fields ONLY — derived from `source` (which must be plaintext),
 * with none of `source`'s own keys carried along.
 *
 * Use this, never `addPiiIndices`, when merging indices onto an already-encrypted
 * object. `addPiiIndices` returns `{...source, ...indices}`, so spreading its
 * result over ciphertext silently restores the plaintext — which is exactly how
 * `payouts.sellerEmail`, `payouts.upiId` and `reviews.userName` ended up stored
 * in cleartext beside a valid index.
 *
 * @param source plaintext document — hashing ciphertext produces a useless index
 */
export function piiIndicesFor(
  source: object,
  mapping: Record<string, string>,
): Record<string, string> {
  const access = source as Record<string, FirestoreValue>;
  const indices: Record<string, string> = {};
  for (const [sourceField, indexField] of Object.entries(mapping)) {
    const val = access[sourceField];
    if (typeof val === "string" && val) {
      indices[indexField] = piiBlindIndex(val);
    }
  }
  return indices;
}

export function addPiiIndices<T extends object>(
  obj: T,
  mapping: Record<string, string>,
): T {
  const result = { ...obj };
  const access = result as Record<string, FirestoreValue>;
  for (const [sourceField, indexField] of Object.entries(mapping)) {
    const val = access[sourceField];
    if (typeof val === "string" && val) {
      access[indexField] = piiBlindIndex(val);
    }
  }
  return result;
}

// --- Nested-object PII helpers ----------------------------------------------

/**
 * Encrypt PII inside a shipping address stored in an order.
 * Supports string and object address shapes.
 */
export function encryptShippingAddress<T>(
  addr: T | undefined | null,
): T | undefined | null {
  if (!addr) return addr;
  if (typeof addr === "string") {
    return encryptPii(addr) as T;
  }
  if (typeof addr !== "object") return addr;
  return encryptPiiFields(addr as object, [
    "fullName",
    "phone",
    "addressLine1",
    "addressLine2",
  ]) as T;
}

/**
 * Decrypt PII inside a shipping address read from an order.
 * Supports string and object address shapes.
 */
export function decryptShippingAddress<T>(
  addr: T | undefined | null,
): T | undefined | null {
  if (!addr) return addr;
  if (typeof addr === "string") {
    return decryptPii(addr) as T;
  }
  if (typeof addr !== "object") return addr;
  return decryptPiiFields(addr as object, [
    "fullName",
    "phone",
    "addressLine1",
    "addressLine2",
  ]) as T;
}

/**
 * Encrypt PII inside seller payoutDetails before writing to Firestore.
 */
export function encryptPayoutDetails<T extends object>(
  details: T | undefined | null,
): T | undefined | null {
  if (!details) return details;
  const result = { ...details } as Record<string, FirestoreValue>;
  // Encrypt top-level upiId
  if (typeof result.upiId === "string" && result.upiId) {
    result.upiId = encryptPii(result.upiId);
  }
  // Encrypt nested bankAccount fields
  const bank = result.bankAccount;
  if (bank && typeof bank === "object" && !Array.isArray(bank) && !(bank instanceof Date)) {
    result.bankAccount = encryptPiiFields(
      { ...bank },
      ["accountNumber"],
    ) as FirestoreValue;
  }
  return result as unknown as T;
}

/**
 * Decrypt PII inside seller payoutDetails after reading from Firestore.
 */
export function decryptPayoutDetails<T extends object>(
  details: T | undefined | null,
): T | undefined | null {
  if (!details) return details;
  const result = { ...details } as Record<string, FirestoreValue>;
  if (typeof result.upiId === "string" && result.upiId) {
    result.upiId = decryptPii(result.upiId);
  }
  const bank = result.bankAccount;
  if (bank && typeof bank === "object" && !Array.isArray(bank) && !(bank instanceof Date)) {
    result.bankAccount = decryptPiiFields(
      { ...bank },
      ["accountNumber"],
    ) as FirestoreValue;
  }
  return result as unknown as T;
}

/**
 * Encrypt PII inside seller shippingConfig.pickupAddress before writing.
 */
export function encryptShippingConfig<T extends object>(
  config: T | undefined | null,
): T | undefined | null {
  if (!config) return config;
  const result = { ...config } as Record<string, FirestoreValue>;
  const addr = result.pickupAddress;
  if (addr && typeof addr === "object" && !Array.isArray(addr) && !(addr instanceof Date)) {
    result.pickupAddress = encryptPiiFields(
      { ...addr },
      ["phone", "email", "address", "address2"],
    ) as FirestoreValue;
  }
  return result as unknown as T;
}

/**
 * Decrypt PII inside seller shippingConfig.pickupAddress after reading.
 */
export function decryptShippingConfig<T extends object>(
  config: T | undefined | null,
): T | undefined | null {
  if (!config) return config;
  const result = { ...config } as Record<string, FirestoreValue>;
  const addr = result.pickupAddress;
  if (addr && typeof addr === "object" && !Array.isArray(addr) && !(addr instanceof Date)) {
    result.pickupAddress = decryptPiiFields(
      { ...addr },
      ["phone", "email", "address", "address2"],
    ) as FirestoreValue;
  }
  return result as unknown as T;
}

/**
 * Encrypt PII on a payout bankAccount sub-object for the payouts collection.
 */
export function encryptPayoutBankAccount<T extends object>(
  bank: T | undefined | null,
): T | undefined | null {
  if (!bank) return bank;
  return encryptPiiFields({ ...bank }, []);
}

/**
 * Decrypt PII on a payout bankAccount sub-object from the payouts collection.
 */
export function decryptPayoutBankAccount<T extends object>(
  bank: T | undefined | null,
): T | undefined | null {
  if (!bank) return bank;
  return decryptPiiFields({ ...bank }, []);
}
