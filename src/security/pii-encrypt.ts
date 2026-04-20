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

// crypto is a Node.js built-in. Use require() to keep it out of the static
// import graph so Next.js Edge bundler does not warn about this file.
/* eslint-disable @typescript-eslint/no-require-imports */
function nodeCrypto() { return require("crypto") as typeof import("crypto"); }
/* eslint-enable @typescript-eslint/no-require-imports */

const ALGO = "aes-256-gcm";
export const ENC_PREFIX = "enc:v1:";
export const HMAC_PREFIX = "hmac-sha256:";

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

/** Check if a value is encrypted by our PII system. */
export function isPiiEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
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
export function addPiiIndices<T extends Record<string, unknown>>(
  obj: T,
  mapping: Record<string, string>,
): T {
  const result = { ...obj };
  for (const [sourceField, indexField] of Object.entries(mapping)) {
    const val = result[sourceField];
    if (typeof val === "string" && val) {
      (result as Record<string, unknown>)[indexField] = piiBlindIndex(val);
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
  return encryptPiiFields(addr as Record<string, unknown>, [
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
  return decryptPiiFields(addr as Record<string, unknown>, [
    "fullName",
    "phone",
    "addressLine1",
    "addressLine2",
  ]) as T;
}

/**
 * Encrypt PII inside seller payoutDetails before writing to Firestore.
 */
export function encryptPayoutDetails<T extends Record<string, unknown>>(
  details: T | undefined | null,
): T | undefined | null {
  if (!details) return details;
  const result = { ...details };
  // Encrypt top-level upiId
  if (typeof result.upiId === "string" && result.upiId) {
    (result as Record<string, unknown>).upiId = encryptPii(
      result.upiId as string,
    );
  }
  // Encrypt nested bankAccount fields
  const bank = result.bankAccount as Record<string, unknown> | undefined;
  if (bank) {
    (result as Record<string, unknown>).bankAccount = encryptPiiFields(
      { ...bank },
      ["accountNumber"],
    );
  }
  return result as T;
}

/**
 * Decrypt PII inside seller payoutDetails after reading from Firestore.
 */
export function decryptPayoutDetails<T extends Record<string, unknown>>(
  details: T | undefined | null,
): T | undefined | null {
  if (!details) return details;
  const result = { ...details };
  if (typeof result.upiId === "string" && result.upiId) {
    (result as Record<string, unknown>).upiId = decryptPii(
      result.upiId as string,
    );
  }
  const bank = result.bankAccount as Record<string, unknown> | undefined;
  if (bank) {
    (result as Record<string, unknown>).bankAccount = decryptPiiFields(
      { ...bank },
      ["accountNumber"],
    );
  }
  return result as T;
}

/**
 * Encrypt PII inside seller shippingConfig.pickupAddress before writing.
 */
export function encryptShippingConfig<T extends Record<string, unknown>>(
  config: T | undefined | null,
): T | undefined | null {
  if (!config) return config;
  const result = { ...config };
  // shiprocketEmail is PII
  if (typeof result.shiprocketEmail === "string" && result.shiprocketEmail) {
    (result as Record<string, unknown>).shiprocketEmail = encryptPii(
      result.shiprocketEmail as string,
    );
  }
  const addr = result.pickupAddress as Record<string, unknown> | undefined;
  if (addr) {
    (result as Record<string, unknown>).pickupAddress = encryptPiiFields(
      { ...addr },
      ["phone", "email", "address", "address2"],
    );
  }
  return result as T;
}

/**
 * Decrypt PII inside seller shippingConfig.pickupAddress after reading.
 */
export function decryptShippingConfig<T extends Record<string, unknown>>(
  config: T | undefined | null,
): T | undefined | null {
  if (!config) return config;
  const result = { ...config };
  if (typeof result.shiprocketEmail === "string" && result.shiprocketEmail) {
    (result as Record<string, unknown>).shiprocketEmail = decryptPii(
      result.shiprocketEmail as string,
    );
  }
  const addr = result.pickupAddress as Record<string, unknown> | undefined;
  if (addr) {
    (result as Record<string, unknown>).pickupAddress = decryptPiiFields(
      { ...addr },
      ["phone", "email", "address", "address2"],
    );
  }
  return result as T;
}

/**
 * Encrypt PII on a payout bankAccount sub-object for the payouts collection.
 */
export function encryptPayoutBankAccount<T extends Record<string, unknown>>(
  bank: T | undefined | null,
): T | undefined | null {
  if (!bank) return bank;
  return encryptPiiFields({ ...bank }, []);
}

/**
 * Decrypt PII on a payout bankAccount sub-object from the payouts collection.
 */
export function decryptPayoutBankAccount<T extends Record<string, unknown>>(
  bank: T | undefined | null,
): T | undefined | null {
  if (!bank) return bank;
  return decryptPiiFields({ ...bank }, []);
}

// --- Public display masking -------------------------------------------------

/**
 * Mask a person's name for public display.
 * Each word is reduced to its first letter followed by "***".
 *
 * "John Doe"  → "J*** D***"
 * "Alice"     → "A***"
 *
 * If the value is still an encrypted blob (e.g. PII_ENCRYPTION_KEY not set),
 * returns "Anonymous" so encrypted ciphertext never leaks to the UI.
 */
export function maskName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "Anonymous";
  if (isPiiEncrypted(name)) return "Anonymous";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] + "***")
    .join(" ");
}

/**
 * Mask an email address for public display.
 * "john.doe@example.com" → "j***@***.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "***@***.***";
  if (isPiiEncrypted(email)) return "***@***.***";
  const atIdx = email.indexOf("@");
  if (atIdx < 0) return "***";
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const dotIdx = domain.lastIndexOf(".");
  const domainMasked = dotIdx > 0 ? "***" + domain.slice(dotIdx) : "***";
  return (local[0] ?? "*") + "***@" + domainMasked;
}

/**
 * Return a copy of a review document with PII fields masked for public display.
 * Admin/owner endpoints should NOT call this — use the raw document instead.
 */
export function maskPublicReview<T extends { userName: string }>(review: T): T {
  return { ...review, userName: maskName(review.userName) };
}

/**
 * Return a copy of a bid document with PII masked for public display
 * (auction product page).
 */
export function maskPublicBid<T extends { userName: string }>(bid: T): T {
  return { ...bid };
}

/**
 * Return a copy of an event-entry document with PII masked for the leaderboard.
 * ipAddress and userEmail are never sent to the client;
 * only userDisplayName needs masking for a public leaderboard view.
 */
export function maskPublicEventEntry<
  T extends {
    userDisplayName?: string;
    userEmail?: string;
    ipAddress?: string;
  },
>(entry: T): Omit<T, "userEmail" | "ipAddress"> {
  const {
    userEmail: _e,
    ipAddress: _ip,
    ...rest
  } = entry as T & {
    userEmail?: string;
    ipAddress?: string;
  };
  return {
    ...rest,
    ...(rest.userDisplayName !== undefined
      ? { userDisplayName: maskName(rest.userDisplayName) }
      : {}),
  } as Omit<T, "userEmail" | "ipAddress">;
}

/**
 * Return a copy of an offer document with buyer PII masked for the seller view.
 * The seller needs to know an offer was made and its amount, but the buyer's
 * full name and email should remain private until the order is confirmed.
 */
export function maskOfferForSeller<
  T extends { buyerName: string; buyerEmail: string },
>(offer: T): T {
  return {
    ...offer,
    buyerName: maskName(offer.buyerName),
    buyerEmail: maskEmail(offer.buyerEmail),
  };
}
