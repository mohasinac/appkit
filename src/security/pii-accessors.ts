/**
 * The two NAMED accessors that replace an unconditional `mapDoc` decrypt.
 *
 * ## Why this module exists
 *
 * `audit-pii-coverage`'s R3 stages fourteen repositories whose `mapDoc`
 * decrypted PII on every read, so ciphertext never left the database and every
 * caller silently handled plaintext. The prescription — copy
 * `SiteSettingsRepository`: leave `mapDoc` alone and expose plaintext through a
 * NAMED getter with a masked variant — is per-repository, and writing it
 * fourteen times would be fourteen chances for the field→mask mapping to
 * drift (Root Cause #75). So the rule lives here once and each repository
 * delegates.
 *
 * ```ts
 *   repo.findById(id)                  → PII fields are Encrypted<string>
 *   repo.revealFor(doc)                → plaintext, opt-in and named
 *   repo.maskedFor(doc)                → masked, the UI default
 * ```
 *
 * ## 🛑 Masking must DECRYPT FIRST
 *
 * This is the trap worth stating, because getting it wrong is silent and looks
 * like success. `maskName`/`maskEmail` in `pii-mask.ts` both begin with
 * `if (hasEncPrefix(value)) return "Anonymous" / "***@***.***"` — a deliberate
 * guard so ciphertext can never reach a UI. Once `mapDoc` stops decrypting,
 * handing a stored field straight to `maskName` therefore returns "Anonymous"
 * for EVERY row: no error, no ciphertext leak, and a masked column that is
 * uniformly useless instead of showing "R*** K***". `maskPii` decrypts and
 * then masks.
 *
 * ## Field → mask is by NAME CLASS, deliberately
 *
 * An email masks differently from a phone from a person's name, and the field
 * lists these repositories already declare (`*_PII_FIELDS`) carry no type
 * information. Classifying on the field name is the only signal available, and
 * it is the same approach `pii-redact.ts` has always used for logs — the
 * difference being that this module uses the USER-FACING masks from
 * `pii-mask.ts` rather than the log-oriented ones.
 *
 * 🛑 The fallback is `maskName`, not "return as-is". An unrecognised PII field
 * name must degrade toward LESS disclosure; returning the plaintext would make
 * a new field silently public the moment someone adds it to a `*_PII_FIELDS`
 * list without touching this file.
 *
 * @tag domain:security
 * @tag layer:security
 * @tag access:server-only
 * @tag sideEffects:none
 */

import { decryptPiiFields } from "./pii-encrypt";
import { maskEmail, maskName, maskPhone } from "./pii-mask";

/** Dotted/`[]` path → its leaf key, which is what the name class reads. */
function leafKey(path: string): string {
  const afterArray = path.includes("[]") ? path.slice(path.indexOf("[]") + 2) : path;
  const parts = afterArray.replace(/^\./, "").split(".");
  return parts[parts.length - 1] || path;
}

function maskByName(key: string, value: string): string {
  const k = leafKey(key).toLowerCase();
  if (k.includes("email")) return maskEmail(value);
  if (k.includes("phone") || k.includes("mobile") || k.includes("contact")) {
    return maskPhone(value);
  }
  // Everything else — names, addresses, UPI handles, account numbers — gets
  // the most conservative mask available rather than passing through.
  return maskName(value);
}

/**
 * Decrypt the named PII fields. **Opt-in and named**: every call site is a
 * deliberate decision that shows up in review and in a grep.
 *
 * The return type is the caller's plaintext-facing shape. That cast is the one
 * place it is legitimate: this function performs the decryption that makes the
 * `Encrypted<…>` brand false, which is exactly what the brand is for.
 */
export function revealPii<Plain extends object>(
  doc: object,
  piiFields: readonly string[],
): Plain {
  return decryptPiiFields({ ...doc }, [...piiFields]) as unknown as Plain;
}

/**
 * Decrypt, then mask. **The default a UI should reach for.**
 *
 * Returns the same shape as `revealPii` because a masked value is still a
 * displayable string — the difference is in what it contains, which is why the
 * two accessors must be separately named rather than one taking a boolean.
 */
export function maskPii<Plain extends object>(
  doc: object,
  piiFields: readonly string[],
): Plain {
  const revealed = revealPii<Record<string, unknown>>(doc, piiFields);

  for (const field of piiFields) {
    /*
     * 🛑 DOTTED PATHS ARE MASKED, not skipped.
     *
     * The first draft skipped them, with a note saying a repository needing
     * nested masking should override the method. Then `sessions` turned out to
     * declare `deviceInfo.ip`, `deviceInfo.userAgent` and `location.city` —
     * ALL THREE of its PII fields are nested. So the "exception" was the first
     * real subject, and a `maskPii` returning those three DECRYPTED would be
     * the `maskPublicBid`-returning-`{...bid}` defect exactly: a function whose
     * name is the only evidence it masked anything (Root Cause #50).
     *
     * `[]` array paths are still skipped, because a per-element mask needs the
     * array's own shape and guessing it would be the same lie one level down.
     */
    if (field.includes("[]")) continue;
    maskAtPath(revealed, field);
  }

  return revealed as unknown as Plain;
}

/**
 * Mask the string at a dotted path, in place. A missing intermediate object or
 * a non-string leaf is left alone — this walks what is there rather than
 * creating structure to mask.
 */
function maskAtPath(root: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let node: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node[parts[i]];
    if (typeof next !== "object" || next === null) return;
    // Clone on the way down: `revealPii` shallow-copies, so mutating a nested
    // object would write through to the caller's document.
    const copy = { ...(next as Record<string, unknown>) };
    node[parts[i]] = copy;
    node = copy;
  }
  const leaf = parts[parts.length - 1];
  const value = node[leaf];
  if (typeof value !== "string" || value.length === 0) return;
  node[leaf] = maskByName(leaf, value);
}

/** Array form of `revealPii`, for list reads. */
export function revealPiiAll<Plain extends object>(
  docs: readonly object[],
  piiFields: readonly string[],
): Plain[] {
  return docs.map((d) => revealPii<Plain>(d, piiFields));
}

/** Array form of `maskPii`, for list reads. */
export function maskPiiAll<Plain extends object>(
  docs: readonly object[],
  piiFields: readonly string[],
): Plain[] {
  return docs.map((d) => maskPii<Plain>(d, piiFields));
}
