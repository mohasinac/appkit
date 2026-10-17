/**
 * `Encrypted<T>` — the FORCING FUNCTION for ciphertext-by-default.
 *
 * ## The problem this exists to solve
 *
 * `audit-pii-coverage`'s R3 stages fourteen repositories whose `mapDoc`
 * decrypts PII on EVERY read. The prescription — copy `SiteSettingsRepository`:
 * leave `mapDoc` alone and expose plaintext through a NAMED getter with a
 * masked variant — is right, and the migration had been staged for one reason:
 *
 *   **`tsc` cannot find the call sites.**
 *
 * Measured 2026-10-17: 147 distinct files touch a staged repository. And
 * `PayoutDocument.sellerEmail` is declared `string` whether the value in it is
 * ciphertext or plaintext, so a call site that gets the wrong one COMPILES. It
 * then either renders `enc:v1:…` to an admin or publishes a decrypted email.
 * There is no compile error, no runtime error, and nothing to grep for.
 *
 * Compare the `perPage` → `pageSize` rename done the same day: renaming one
 * interface member turned all 65 consumers into compile errors and `tsc`
 * handed over the list. That is the difference between a safe sweep and a
 * 147-file guess, and it is purely a property of the TYPE.
 *
 * ## How it works
 *
 * A branded string. `Encrypted<string>` is assignable FROM nothing but itself,
 * so every reader that wants a plain `string` must go through one of the two
 * named accessors below — and until it does, it is a compile error naming the
 * exact file and line.
 *
 * ```ts
 * //   payout.sellerEmail            → Encrypted<string>   (what Firestore holds)
 * //   plaintext(payout.sellerEmail) → string              (opt-in, named, auditable)
 * //   maskedEmail(payout.sellerEmail) → string            (the UI default)
 * ```
 *
 * The brand is erased at runtime: `Encrypted<string>` IS a string, so nothing
 * changes about what is stored, sent or compared. It exists only to make the
 * compiler ask the question at every site.
 *
 * ## 🛑 Branding a field is HALF a change, never a whole one
 *
 * The type must be made true in the same commit, by removing that
 * repository's unconditional `mapDoc` decrypt. Branding a field whose value is
 * still decrypted on read asserts something false, and the first `plaintext()`
 * call would then double-decrypt — `decryptValue` passes a non-`enc:v1:`
 * string through unchanged, so it would silently "work" and hide the lie.
 *
 * Convert ONE repository per change, smallest consumer count first. `tsc` then
 * enumerates only that repository's readers, which is the whole point: a
 * reviewable list per step instead of 147 at once.
 */

declare const ENCRYPTED_BRAND: unique symbol;

/**
 * A string that is CIPHERTEXT as it sits in Firestore.
 *
 * Erased at runtime. Assignable to nothing that wants a plain `string`, which
 * is what turns every reader into a decision the compiler insists on.
 */
export type Encrypted<T extends string = string> = T & {
  readonly [ENCRYPTED_BRAND]: "pii";
};

/**
 * Mark a value as ciphertext. For a repository's own read path, where the value
 * genuinely came out of Firestore encrypted.
 *
 * 🛑 Not for widening a plaintext value to satisfy a type. If a caller has
 * plaintext and the field wants `Encrypted`, the value needs ENCRYPTING, not
 * re-labelling — `encryptPii` is the function for that.
 */
export const asEncrypted = <T extends string>(value: T): Encrypted<T> =>
  value as Encrypted<T>;

/**
 * Narrow a possibly-undefined ciphertext field. Saves every call site writing
 * the same `value === undefined ? undefined : …` dance.
 */
export const asEncryptedMaybe = <T extends string>(
  value: T | undefined | null,
): Encrypted<T> | undefined =>
  value === undefined || value === null ? undefined : asEncrypted(value);

/*
 * 🛑 There is deliberately NO `plaintext(value)` helper in this module.
 *
 * The first draft had one, and it was a lie of exactly the kind this whole
 * sweep exists to remove: it took an `Encrypted<string>` and returned
 * `string` by casting — so a function named `plaintext` handed back
 * CIPHERTEXT, and every caller would have rendered `enc:v1:…` while the types
 * said everything was fine. `decryptValue` passes a non-`enc:v1:` string
 * through unchanged, so it would even have "worked" on the rows that were
 * never encrypted, and failed only on the ones that were.
 *
 * Decryption needs the key and `node:crypto`, which belong to the server; this
 * module is types-only so it stays importable from a client bundle (Root Cause
 * #24). So the plaintext path lives where the decryption actually happens:
 *
 *   on the REPOSITORY, as a named method, following `SiteSettingsRepository` —
 *   `getDecryptedCredentials()` / `getCredentialsMasked()`.
 *
 * Masked is the default a UI should reach for; plaintext is opt-in and named,
 * so it shows up both in review and in a grep.
 */
