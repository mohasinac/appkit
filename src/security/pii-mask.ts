/**
 * PII display-masking helpers — pure string manipulation, zero runtime
 * dependencies. Split out from pii-encrypt.ts so these can be exported
 * from the universal client+server barrel (index.ts): pii-encrypt.ts has
 * a top-level `import { createRequire } from "node:module"` (needed for
 * the AES-256-GCM/HMAC functions to work under both Next.js's bundler and
 * a pure-ESM standalone script context) that poisons the whole module for
 * client bundling — Turbopack statically resolves every export in a file
 * before tree-shaking, so re-exporting even one crypto-free symbol from
 * pii-encrypt.ts still pulls `node:module` into the client graph and hard
 * fails the browser build. This file has no such import and is safe
 * anywhere `ReviewModal`/`ReviewDetailShell`/`ReviewsList` (client
 * components displaying masked reviewer names) can reach it.
 */

export const ENC_PREFIX = "enc:v1:";
export const HMAC_PREFIX = "hmac-sha256:";

/**
 * Which crypto system produced an `enc:v1:` value.
 *
 * TWO systems share this prefix and always have:
 *
 *   PII      `enc:v1:` + iv `:` ciphertext `:` tag   — PII_ENCRYPTION_KEY
 *   settings `enc:v1:` + iv `.` tag `.` ciphertext   — SETTINGS_ENCRYPTION_KEY
 *
 * Different separator, different field order, different key. `isPiiEncrypted`
 * checked only the prefix and so could not tell them apart, which made every
 * "is this ours" test wrong for one of the two — feed a settings value to
 * `decryptValue` and it throws on the part count; feed a PII value to
 * `decryptSecret` and it throws on a different part count. Neither error names
 * the actual problem.
 *
 * Changing either prefix is NOT an option: `enc:v1:` is stamped into every
 * encrypted value across twelve collections, and a new prefix orphans all of
 * it. It does not need changing. Base64's alphabet is `A-Za-z0-9+/=`, which
 * contains neither `.` nor `:` — so the two formats are ALREADY unambiguous in
 * the data, and this function simply reads what is there. No migration.
 */
export type EncEnvelopeKind = "pii" | "settings" | null;

export function encEnvelopeKind(value: unknown): EncEnvelopeKind {
  if (typeof value !== "string" || !value.startsWith(ENC_PREFIX)) return null;
  const inner = value.slice(ENC_PREFIX.length);
  const colons = inner.split(":").length - 1;
  const dots = inner.split(".").length - 1;
  if (colons === 2 && dots === 0) return "pii";
  if (dots === 2 && colons === 0) return "settings";
  return null; // carries the prefix but neither shape — malformed
}

/**
 * Does this value carry the `enc:v1:` prefix at all, whichever system wrote it
 * and even if malformed?
 *
 * This is the check the DISPLAY masks want. `maskName`/`maskEmail` exist so
 * ciphertext never reaches the UI, and for that purpose "settings-encrypted"
 * and "malformed" are just as unshowable as "PII-encrypted". Narrowing them to
 * `kind === "pii"` would let the other two render verbatim.
 */
export function hasEncPrefix(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

/**
 * Check if a value is encrypted by our PII system SPECIFICALLY.
 *
 * Use for crypto routing — "may I hand this to decryptValue". For "is this
 * unshowable", use `hasEncPrefix`.
 */
export function isPiiEncrypted(value: string): boolean {
  return encEnvelopeKind(value) === "pii";
}

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
  if (hasEncPrefix(name)) return "Anonymous";
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
  if (hasEncPrefix(email)) return "***@***.***";
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
  return { ...bid, userName: maskName(bid.userName) };
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
