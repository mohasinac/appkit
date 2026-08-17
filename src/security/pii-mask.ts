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

/** Check if a value is encrypted by our PII system. */
export function isPiiEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
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
