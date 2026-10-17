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
 * Erased at runtime — the VALUE is a string, so nothing changes about what is
 * stored, sent or compared. The TYPE is not a string, and that is the point.
 *
 * ## 🛑 This was `T & { brand }`, and that version caught NO readers at all
 *
 * An intersection is a SUBTYPE of `string`, so `Encrypted<string>` was
 * assignable to anything accepting a `string`. Measured directly: the write
 * direction errored, while `maskName(cipher)`, `` `${cipher}` `` and
 * `const s: string = cipher` all compiled in silence.
 *
 * So the fourteen-repository sweep enumerated every WRITE and not one READ —
 * and this file's own docstring asserted the opposite, which is why the gap
 * went unnoticed until `/reviews/[id]` was found rendering "Anonymous" for
 * every reviewer (`findById` returned ciphertext, an `as Review` cast erased
 * the brand, and `maskName` refuses ciphertext by design). Nine
 * cross-repository writes were meanwhile double-encrypting PII, including the
 * `upiId` two scheduled jobs send money to.
 *
 * A nominal shape is assignable to nothing that wants a `string`, so every
 * reader becomes a compile error naming its file and line. That is the
 * enumeration the intersection form could never produce.
 *
 * `__plain` is phantom — never read, never written, optional so no value has to
 * carry it. It keeps `Encrypted<"a">` and `Encrypted<"b">` distinct rather than
 * collapsing both to one opaque brand.
 */
export type Encrypted<T extends string = string> = {
  readonly [ENCRYPTED_BRAND]: "pii";
  readonly __plain?: T;
};

/**
 * A document type with its `Encrypted<string>` members as plain `string`.
 *
 * ONE definition of "the plaintext shape", so each feature's `<Doc>Plain`
 * alias and `BaseRepository`'s write signature agree by construction. Thirteen
 * hand-rolled copies of this mapped type is thirteen chances to get the
 * `undefined` handling subtly different, and the difference only shows up as a
 * cast somebody adds to make one call site compile (Root Cause #75).
 *
 * `Extract<T[K], undefined>` preserves optionality: a field declared
 * `Encrypted<string> | undefined` stays `string | undefined`, rather than
 * becoming required.
 */
export type Plaintext<T> = {
  /*
   * `| null` as well as `| undefined`: `UserDocument` declares
   * `email: string | null`, and a condition written only against `undefined`
   * left all three of its PII fields un-mapped — so `UserPlain` was identical
   * to `UserDocument` and every write path stayed broken while the type looked
   * converted.
   */
  [K in keyof T]: T[K] extends Encrypted<string> | null | undefined
    ? Extract<T[K], null | undefined> | string
    : /*
       * 🛑 `Exclude<T[K], null | undefined>` before the Date/array test.
       *
       * The test used to be `T[K] extends Date | ReadonlyArray<unknown> | …`,
       * which is FALSE for an OPTIONAL array: `X[] | undefined` is not
       * assignable to `ReadonlyArray<unknown>`. So every optional array fell
       * through to the object branch and got mapped — observable in an error
       * reading `Plaintext<StatusChangeEntry>[]`.
       *
       * Harmless only by luck: `orders` declares `items?: OrderDocumentItem[]`,
       * and the day that gains a PII member the recursion would silently
       * un-brand it on the write path — the exact failure this type exists to
       * prevent, one level down.
       */
      Exclude<T[K], null | undefined> extends
        | Date
        | ReadonlyArray<unknown>
        | ((...args: never[]) => unknown)
      ? T[K]
      : // Recurse into PLAIN OBJECT members only.
      //
      // 🛑 This was non-recursive at first, on the reasoning that recursion is
      // "more power than the other repositories need". `sessions` disproved
      // it: all three of its PII fields are nested (`deviceInfo.ip`,
      // `deviceInfo.userAgent`, `location.city`), so a top-level-only mapper
      // left four auth routes unable to pass the plaintext they had literally
      // just read off the request headers.
      //
      // Recursing is also correct in principle on the WRITE path, which is the
      // only place this type is used: `encryptPiiFields` understands dotted
      // paths, so it encrypts a nested PII field exactly as it does a
      // top-level one. Depth is not a property the caller should have to care
      // about.
      //
      // `Date`, arrays and functions are excluded — mapping over a `Date`
      // would produce an object of its METHODS, which type-checks and is
      // nonsense, and an array's numeric keys are not PII paths.
      T[K] extends Date | ReadonlyArray<unknown> | ((...args: never[]) => unknown)
      ? T[K]
      : T[K] extends object | undefined
        ? Extract<T[K], undefined> | Plaintext<Exclude<T[K], undefined>>
        : T[K];
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
  /*
   * `as unknown as` is REQUIRED here, and only here.
   *
   * With the nominal brand, `Encrypted<T>` is not a string type, so a direct
   * cast is a TS2352 ("neither type sufficiently overlaps"). That error is
   * correct and is the entire point of the nominal shape — this one function
   * is the sanctioned crossing, which is why the double cast is confined to it
   * rather than appearing at call sites.
   *
   * Its four real callers all pass `""` to BLANK a field on a display-only
   * read, not to relabel a secret.
   */
  value as unknown as Encrypted<T>;

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
