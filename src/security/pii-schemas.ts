/**
 * Collection-Specific PII Field Mappings
 *
 * Defines which fields in each Firestore collection contain PII that should be
 * encrypted before storage and decrypted on read.
 */

/** PII fields in the users collection (top-level string fields) */
/**
 * `googleLinkedEmail` was added 2026-08-28, found by audit-pii-coverage.
 *
 * It is a real email address, written in cleartext by the Google OAuth callback
 * (`api/auth/google/callback`, three write sites) and stored on the user
 * document beside `email` — which has always been encrypted. So one user's two
 * email addresses sat in the same document, one ciphertext and one plaintext,
 * and nothing pointed at the difference.
 *
 * No blind index: nothing queries by it. Its only reader is the account
 * holder's own profile ("Signed in as …"), which is a legitimate plaintext read.
 *
 * Existing rows stay plaintext until backfilled and keep reading correctly —
 * `decryptValue` passes a non-`enc:v1:` string through unchanged — so new
 * writes encrypt while old rows converge, never diverge. Add
 * `googleLinkedEmail` to the `users` target in `backfill-pii.mjs` when that
 * backfill is next run.
 */
export const USER_PII_FIELDS = ["email", "phoneNumber", "googleLinkedEmail"] as const;

/** Blind-index mapping for queryable user PII: source → index field name */
export const USER_PII_INDEX_MAP: Record<string, string> = {
  email: "emailIndex",
  phoneNumber: "phoneIndex",
};

/** PII fields in the addresses subcollection */
export const ADDRESS_PII_FIELDS = [
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
] as const;

/** PII fields in orders (denormalized buyer/seller data) */
export const ORDER_PII_FIELDS = [
  "userName",
  "userEmail",
  "sellerEmail",
  /*
   * ── The delivery snapshot (Part 14) ──────────────────────────────────────
   *
   * 🛑 **CORRECTED 2026-10-23.** These were first written as flat keys on the
   * argument that "`encryptPiiFields` is a flat top-level loop that never
   * descends" — CLAUDE.md's wording, and it is FALSE. Read the function: it
   * handles dotted paths (`lastMessage.body`, already live above) AND
   * `array[].key` via `encryptInArray`, in both directions.
   *
   * Flat keys stay, on a smaller and true argument: city / state / pincode /
   * country must remain unencrypted and QUERYABLE, so a single
   * `deliveryAddress` object would be half-encrypted — and a half-encrypted
   * object is the shape nobody can reason about at a glance. Flat keys make
   * each field's treatment visible in this list.
   *
   * What the encryptor does NOT do is infer. A field is covered only if it is
   * NAMED, in the right notation — and `"fullName"` does not cover
   * `deliveryAmendments[].fullName`. That is the real failure mode, and what
   * `audit-snapshot-integrity` R1 checks.
   *
   * 🛑 `shippingAddress` is deliberately NOT added. It is legacy free text on
   * existing rows; encrypting the field now would encrypt it on the next
   * write of an old order while every other old row stays plaintext, giving
   * one field two formats and no way to tell which a given row holds.
   * Forward-only means the new fields carry the protection.
   *
   * city / state / pincode / country are absent on purpose — they decide tax
   * and serviceability and must stay QUERYABLE.
   */
  "deliveryFullName",
  "deliveryPhone",
  "deliveryAddressLine1",
  "deliveryAddressLine2",
  "deliveryLandmark",
  /*
   * The amendment array, in the `array[].key` notation `encryptInArray`
   * implements. Declared HERE rather than encrypted by hand at the write
   * site: the repository's write hook already runs this list, and a second
   * mechanism doing the same job is the drift this codebase keeps paying for.
   */
  "deliveryAmendments[].fullName",
  "deliveryAmendments[].phone",
  "deliveryAmendments[].addressLine1",
  "deliveryAmendments[].addressLine2",
  "deliveryAmendments[].landmark",
] as const;

/** PII fields in payouts */
export const PAYOUT_PII_FIELDS = ["sellerEmail", "upiId"] as const;

/** Blind-index mapping for queryable payout PII */
export const PAYOUT_PII_INDEX_MAP: Record<string, string> = {
  sellerEmail: "sellerEmailIndex",
};

/**
 * PII fields in bids.
 *
 * `userEmail` only. `userName` is deliberately NOT encrypted: the seller bid
 * search (`/api/store/bids`) does a prefix match on it, and encryption and
 * partial-match search are mutually exclusive over the same field — ciphertext
 * has no usable prefix. Encrypting it would silently break that search.
 * Bidder names are already masked on the public side by `maskPublicBid`.
 */
export const BID_PII_FIELDS = ["userEmail"] as const;

/*
 * NEWSLETTER_PII_FIELDS / NEWSLETTER_PII_INDEX_MAP were DELETED here.
 *
 * They were an empty `[]` and `{}` with no reader anywhere — only three barrel
 * re-exports. `NewsletterRepository` does not extend `BaseRepository`; it holds
 * its OWN module-local `NEWSLETTER_PII_FIELDS = ["email"]` and encrypts through
 * that, so newsletter emails ARE encrypted at rest.
 *
 * The empty pair therefore did nothing except read, convincingly, as proof that
 * newsletter PII was unencrypted — a shadow constant of exactly the shape in
 * Root Cause #53, where the symbol a grep finds is not the one doing the work.
 * Deleting it is the fix; populating it would have been a no-op.
 */

/**
 * PII fields in tokens (email verification / password reset).
 *
 * Was an empty array, so the encrypt/decrypt machinery wrapped around these
 * repositories was a no-op and every verification/reset email sat in cleartext.
 * Safe to enable because `findByEmail` already queries the blind index first
 * and falls back to plaintext equality, so legacy rows keep resolving while new
 * ones are encrypted.
 */
export const TOKEN_PII_FIELDS = ["email"] as const;

/** Blind-index mapping for token email queries */
export const TOKEN_PII_INDEX_MAP: Record<string, string> = {
  email: "emailIndex",
};

/**
 * D9 — chat. Re-created against the SUBCOLLECTION redesign, not the old
 * embedded-array one the comment below used to describe.
 *
 * `messages/{id}` is a true Firestore subcollection now (one document per
 * message, not `conversations.messages[]`), so there is no array to walk and
 * the old `messages[].body` `[]`-syntax path does not apply here — `body` is a
 * plain top-level field on each message document. Only `lastMessage.body`, a
 * nested object on the PARENT `conversations` document, needs the dotted-path
 * form `encryptPiiFields` already supports.
 *
 * No blind index on either: nothing queries chat by body content, and a
 * `searchTxt` over an encrypted body would hand back only what the encryption
 * withheld — chat search, if it exists, indexes participant names only.
 */
export const CONVERSATION_PII_FIELDS = ["lastMessage.body"] as const;
export const MESSAGE_PII_FIELDS = ["body"] as const;

/** PII fields in reviews */
export const REVIEW_PII_FIELDS = ["userName"] as const;

/** Blind-index mapping for queryable review PII */
export const REVIEW_PII_INDEX_MAP: Record<string, string> = {
  userName: "userNameIndex",
};

/** PII fields in offers (buyer + seller data) */
export const OFFER_PII_FIELDS = [
  "buyerName",
  "buyerEmail",
  "sellerName",
] as const;

/** PII fields in event entries */
export const EVENT_ENTRY_PII_FIELDS = [
  "userDisplayName",
  "userEmail",
  "ipAddress",
] as const;

/** PII fields in lottery entries */
export const LOTTERY_ENTRY_PII_FIELDS = [
  "userPhone",
  "userEmail",
  "userDisplayName",
] as const;

/**
 * PII fields on the stores collection.
 *
 * `pan` only — the seller's Permanent Account Number, needed to onboard them as
 * a split-settlement vendor. It is a government identity number and the one
 * field on `StoreDocument` whose disclosure has a legal dimension rather than a
 * commercial one.
 *
 * 🛑 THIS IS NOT THE `STORE_SECRET_FIELDS` THE COMMENT BELOW DESCRIBES, and the
 * difference is which KEY encrypts it. This list is assigned to
 * `StoreRepository.piiFields`, so it is encrypted by `encryptPiiFields` with
 * the PII key — the same mechanism as every other entry in this file, and the
 * reason it belongs here. The deleted constant named fields encrypted with
 * `SETTINGS_ENCRYPTION_KEY`, i.e. the OTHER crypto system, which is exactly why
 * its presence in this registry was the hazard rather than its contents.
 *
 * 🛑 No blind index: nothing queries a store by PAN, and a PAN is not a lookup
 * key — it is a value handed to one aggregator at registration time.
 *
 * 🛑 `StoreRepository.mapDoc` does NOT decrypt it. Reads return `enc:v1:…` and
 * plaintext requires the named `revealPan` accessor, which is the
 * `SiteSettingsRepository` shape `audit-pii-coverage` R3 prescribes.
 */
export const STORE_PII_FIELDS = ["pan"] as const;

// `STORE_SECRET_FIELDS = ["whatsappConfig.accessToken"]` was deleted here.
//
// It had ZERO consumers, and its presence in this file was the whole hazard:
// it sat in the PII-field registry, formatted identically to the entries above
// that ARE assigned to a repository's `piiFields` — while its own doc-comment
// said it was encrypted with SETTINGS_ENCRYPTION_KEY, the other key entirely.
//
// Wiring it into a `piiFields` override would have encrypted every store's Meta
// bearer token with the PII key while `StoreRepository.decryptSecrets` kept
// decrypting with the settings key: a hard throw on every store read, and
// live seller tokens unrecoverable without a bespoke migration. Dotted-path
// support was added to `encryptPiiFields` in 2026-08, which is exactly what
// made that one-line mistake possible.
//
// The token is handled where it belongs — `encryptSecret`/`decryptSecret` in
// `StoreRepository`. A constant does not need to exist for that.

/** PII fields in savedPaymentMethods — full identifier (UPI VPA, card PAN, etc.) */
export const PAYMENT_METHOD_PII_FIELDS = ["identifier"] as const;
