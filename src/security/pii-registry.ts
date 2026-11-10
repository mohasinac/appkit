/**
 * WHY: Which fields are PII, which are blind-indexed, and which carry a
 *      whole-word token index had FIVE independent copies. They drifted, and
 *      the drift produced two live defects.
 * WHAT: ONE declarative, introspectable policy per collection — the single
 *       thing every writer, every backfill and the PII CMS reads.
 *
 * ## 🛑 THE FIVE COPIES THIS REPLACES, AND WHAT EACH ONE COST
 *
 * Measured 2026-11-10 against `dev-db`:
 *
 * | # | Copy | What it got wrong |
 * |---|---|---|
 * | 1 | `pii-schemas.ts` `*_PII_FIELDS` / `*_PII_INDEX_MAP` | the baseline — correct |
 * | 2 | `seed-cli.mjs` → `encryptSeedPii`'s module-local `PII_MAP` | **omits `supportTickets`** → `userEmail` seeded PLAINTEXT on 2/2 |
 * | 3 | `seed-cli.mjs` → `TOKENS_INDEX_MAP` + the bespoke `loadUsers` block | **omits `users` and `addresses`** → `nameTokensIndex` absent on 20/20 and 3/3 |
 * | 4 | `backfill-pii.mjs` `TARGETS` (*"keep in sync when a field is added there"*) | a hand-maintained third list, and it targeted `admin.firestore()` = PRODUCTION |
 * | 5 | `auth/src/constants/pii-registry.ts` | five collections TRANSCRIBED BY HAND from repositories it cannot import |
 *
 * The repository write hooks were never broken. Proven by running
 * `UserRepository.applyWriteHooks({displayName, email})` in isolation: it
 * returns `nameTokensIndex` with 4 digests. **Every document missing the index
 * was written by copy #3, which never calls `buildTokensIndex` at all.** The
 * decisive differential is `payouts` — the ONE collection in copy #3's map, and
 * the ONE collection whose `*TokensIndex` is actually present in the data.
 *
 * ## 🛑 THE "UNEXPLAINED" INDEX FIELDS WERE NEVER UNEXPLAINED
 *
 * CLAUDE.md records 10 blind-index fields across 5 collections with no known
 * writer, and an "unknown third writer" writing `orders`/`bids`/`offers`. All
 * ten are `encryptPiiFields` itself: for every TOP-LEVEL field it encrypts it
 * also writes a DERIVED `` `${field}Index` `` sibling, regardless of any map
 * (see pii-encrypt.ts, the comment at the `result[`${field}Index`]` line).
 *
 * Verified field by field:
 *   users      emailIndex + phoneNumberIndex   derived; phoneIndex from the MAP
 *   addresses  fullNameIndex phoneIndex addressLine1Index addressLine2Index
 *                                              derived, all four, no map exists
 *   orders     userNameIndex userEmailIndex sellerEmailIndex   derived
 *   bids       userEmailIndex                 derived
 *   offers     buyerNameIndex buyerEmailIndex sellerNameIndex  derived
 *
 * So `derivedIndexFieldsFor` below computes them, and a report built on this
 * registry has **zero** unexplained index fields. That matters because the
 * recorded conclusion from the unexplained ones — *"never decide what is
 * sensitive by reading a map"* — is right for a different reason than assumed:
 * the map is not the inventory because the ENCRYPTOR writes indices the map
 * never mentions.
 *
 * ## 🛑 WHAT THIS REGISTRY CANNOT DO, STATED SO NOBODY BUILDS A TOGGLE
 *
 * Changing a policy here is a **DATA MIGRATION**, not a configuration change:
 *
 *   - adding a field does NOT encrypt rows already stored in plaintext
 *   - removing a field does NOT decrypt rows already stored as ciphertext
 *   - adding or renaming an index does NOT reindex, so search silently misses
 *     every existing row — the exact shape of defect #1 above
 *
 * `decryptValue` passes a non-`enc:v1:` string through unchanged, which is what
 * makes a converging migration safe (new writes encrypt, old rows keep reading)
 * and is also why nobody noticed the plaintext for months. The sequence is
 * add → dual-write → backfill → switch reads → reindex → drop, and
 * `scripts/pii-backfill.mjs` is the backfill step. **An editor over this
 * registry without that tool beside it is a switch that looks like it changed
 * the data and did not.**
 *
 * @tag domain:security
 * @tag layer:shared
 * @tag pattern:registry
 * @tag access:universal
 * @tag consumers:seed-cli,pii-backfill,auth/constants/pii-registry,audit-pii-registry
 * @tag sideEffects:none
 */

import {
  USER_PII_FIELDS,
  USER_PII_INDEX_MAP,
  ADDRESS_PII_FIELDS,
  ORDER_PII_FIELDS,
  PRODUCT_PII_FIELDS,
  PAYOUT_PII_FIELDS,
  PAYOUT_PII_INDEX_MAP,
  BID_PII_FIELDS,
  TOKEN_PII_FIELDS,
  TOKEN_PII_INDEX_MAP,
  REVIEW_PII_FIELDS,
  REVIEW_PII_INDEX_MAP,
  OFFER_PII_FIELDS,
  EVENT_ENTRY_PII_FIELDS,
  GIVEAWAY_ENTRY_PII_FIELDS,
  PAYMENT_METHOD_PII_FIELDS,
  CONVERSATION_PII_FIELDS,
  MESSAGE_PII_FIELDS,
  STORE_PII_FIELDS,
} from "./pii-schemas";

/**
 * A whole-word HMAC token index — `*TokensIndex`.
 *
 * Written by a `protected buildTokensIndexFor()` override on the repository,
 * which no runtime introspection can reach. Declaring it HERE is what makes it
 * readable by the seeder, the backfill and the CMS without any of them having
 * to re-derive it from a method body.
 */
export interface PiiTokensIndexSpec {
  /** The stored field name, e.g. `nameTokensIndex`. */
  field: string;
  /** Plaintext source fields the digests are built from, in order. */
  from: readonly string[];
}

/**
 * Where a collection's field list physically lives.
 *
 * 🛑 `transcribed` is not cosmetic. Five collections declare their PII inline
 * in the repository (`piiFields = ["ownerEmail"] as const`) or in a feature
 * schema this module must not import — `security/` sits below `features/` and
 * importing upward would drag a dozen feature graphs into every consumer that
 * needs one string. Those are copied here by hand, and
 * `scripts/audit-pii-registry.mjs` asserts the copy still matches the source,
 * so a hand-maintained list is POLICED rather than merely annotated.
 */
export type PiiFieldSource = "constant" | "transcribed";

export interface PiiCollectionPolicy {
  /** Firestore collection name — what a sampler reads. */
  collection: string;
  /** Human label for the CMS. */
  label: string;
  /** The repository that owns the encryption, so a drift has an address. */
  repository: string;
  /**
   * HOW the encryption is enforced on writes. Defaults to `write-hook`.
   *
   * 🛑 The two are not equally safe, and the difference is worth seeing on the
   * CMS rather than discovering from an incident.
   *
   * - **`write-hook`** — `protected override piiFields = …`, run by
   *   `BaseRepository.applyWriteHooks`. EVERY write path gets it: `create`,
   *   `createWithId`, `update` and the whole `*InTx` / `*InBatch` family. A new
   *   method cannot silently skip encryption.
   * - **`provider-hook`** — the collection is reached through
   *   `IDbProvider.getRepository(name)`, i.e. the GENERIC
   *   `FirebaseRepository`, which has no per-collection subclass to declare
   *   anything on. It resolves THIS registry by collection name in its own
   *   `applyWriteHooks`, so enforcement is as total as `write-hook` —
   *   `create`, `update` and `batchCreate` all run it — and the policy lives
   *   here rather than in a subclass. ⚠ It writes no `*TokensIndex`: that
   *   needs a `buildTokensIndexFor()` override, which only a subclass has.
   * - **`explicit-call`** — the repository calls `encryptPiiFields(...)` by hand
   *   at its write sites. That is encryption opt-in PER METHOD, which is the
   *   arrangement that left `sessions.deviceInfo.ip` in plaintext: three call
   *   sites remembered and `createWithId` did not.
   *
   *   🛑 **As of 2026-11-11 this is a DECLARED EXCEPTION, not a default.**
   *   Five of the six collections that used it moved to the hook; the one that
   *   remains cannot, and must say why in `enforcementException`.
   *   `scripts/audit-pii-registry.mjs` R4 ERRORS on an `explicit-call` policy
   *   with no reason recorded, so the weaker arrangement can no longer be
   *   adopted silently — it has to be argued for in this file.
   */
  enforcement?: "write-hook" | "provider-hook" | "explicit-call";
  /**
   * The module holding the `explicit-call` writes (or, for `provider-hook`,
   * the generic repository running the hook), relative to `appkit/src`.
   */
  enforcedIn?: string;
  /**
   * 🛑 REQUIRED when `enforcement` is `explicit-call`. Why this collection
   * cannot use the declarative hook — a structural reason, not a to-do.
   * Audited by R4.
   */
  enforcementException?: string;
  /**
   * Fields encrypted at rest, in `encryptPiiFields` notation: `email`,
   * `deviceInfo.ip`, `deliveryAmendments[].phone`.
   */
  fields: readonly string[];
  /** Where `fields` comes from. See `PiiFieldSource`. */
  fieldSource: PiiFieldSource;
  /**
   * The symbol `fields` was copied from, for the audit to find. Set only when
   * `fieldSource` is `transcribed`.
   */
  transcribedFrom?: string;
  /** `*_PII_INDEX_MAP` — plaintext field → index field. `{}` when none exists. */
  indexMap: Readonly<Record<string, string>>;
  /** The collection's `*TokensIndex`, or `null` when it has none. */
  tokensIndex: PiiTokensIndexSpec | null;
  /**
   * Nested-object encryptors this collection also runs, by name — the
   * `encryptPayoutDetails` / `encryptShippingConfig` family. They are NOT
   * field paths and `encryptPiiFields` does not cover them; a backfill must
   * call the named helper.
   */
  nestedEncryptors?: readonly string[];
  /** Set when this is a SUBCOLLECTION and not readable as a root collection. */
  subcollectionOf?: string;
  /**
   * 🛑 Set when `mapDoc` does NOT decrypt, so reads return ciphertext and
   * plaintext needs a named accessor. A backfill must not assume it can read
   * through the repository.
   */
  readsReturnCiphertext?: boolean;
  /** Anything an operator needs in order to read the row correctly. */
  note?: string;
}

/**
 * 🛑 The ONE list. Every writer, every backfill and the CMS read it.
 *
 * Field lists come from the `*_PII_FIELDS` constants wherever one exists, so
 * this is a registry OF them and never a second copy. The five `transcribed`
 * entries are the exception the audit script exists for.
 */
export const PII_POLICIES: readonly PiiCollectionPolicy[] = [
  {
    collection: "users",
    label: "Users",
    repository: "UserRepository",
    fields: USER_PII_FIELDS,
    fieldSource: "constant",
    indexMap: USER_PII_INDEX_MAP,
    /*
     * 🛑 `phoneNumber` is deliberately NOT a token source. A phone number has
     * no word boundaries, so tokenising it yields one token that is the whole
     * number — an exact lookup `phoneIndex` already provides, with none of
     * this field's extra surface.
     */
    tokensIndex: { field: "nameTokensIndex", from: ["displayName", "email"] },
    nestedEncryptors: ["encryptPayoutDetails", "encryptShippingConfig"],
    note:
      "googleLinkedEmail is declared PII with NO index — nothing queries by it. " +
      "phoneNumberIndex is the DERIVED name and nothing reads it; every lookup " +
      "uses the mapped phoneIndex.",
  },
  {
    collection: "addresses",
    label: "Addresses",
    repository: "AddressesRepository",
    fields: ADDRESS_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    /*
     * 🛑 The NAME only. The street line is never tokenised — "find everyone on
     * Brigade Road" is not a capability admin needs and is the single most
     * re-identifying thing in the document. (The per-field DERIVED indices are
     * exact-match and are what address clustering uses; a token index over a
     * street would be searchable, which is different.)
     */
    tokensIndex: { field: "nameTokensIndex", from: ["fullName"] },
    note:
      "All four observed index fields are DERIVED by encryptPiiFields; no map " +
      "exists and none is needed. Address clustering matches banned addresses " +
      "by exact value, so they are load-bearing.",
  },
  {
    collection: "orders",
    label: "Orders",
    repository: "OrderRepository",
    fields: ORDER_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note:
      "Five of its paths are `deliveryAmendments[].*` array paths, which maskPii " +
      "SKIPS by design and which a flat key read cannot check. city/state/" +
      "pincode/country are absent on purpose — they decide tax and must stay queryable.",
  },
  {
    collection: "payouts",
    label: "Payouts",
    repository: "PayoutRepository",
    fields: PAYOUT_PII_FIELDS,
    fieldSource: "constant",
    indexMap: PAYOUT_PII_INDEX_MAP,
    tokensIndex: { field: "sellerTokensIndex", from: ["sellerName", "sellerEmail"] },
    note:
      "SEED_TRANSACTIONAL: it cascades and RESEEDS on every tester run that " +
      "touches its store, so its token index has to be written by the seeder too.",
  },
  {
    collection: "reviews",
    label: "Reviews",
    repository: "ReviewRepository",
    fields: REVIEW_PII_FIELDS,
    fieldSource: "constant",
    indexMap: REVIEW_PII_INDEX_MAP,
    tokensIndex: null,
  },
  {
    collection: "bids",
    label: "Bids",
    repository: "BidRepository",
    fields: BID_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note:
      "userName is deliberately NOT encrypted: the seller bid search prefix-matches " +
      "it, and encryption and partial-match search are mutually exclusive.",
  },
  {
    collection: "offers",
    label: "Offers",
    repository: "OfferRepository",
    fields: OFFER_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note:
      "Moved from explicit-call to the write hook 2026-11-11. `createOffer`'s " +
      "bespoke `.set()` now routes through applyWriteHooks too, which also gave " +
      "it the `searchTxt` it never wrote — a new offer was unfindable in the " +
      "admin search until something updated it.",
  },
  {
    collection: "emailVerificationTokens",
    label: "Email verification tokens",
    repository: "EmailVerificationTokenRepository",
    fields: TOKEN_PII_FIELDS,
    fieldSource: "constant",
    indexMap: TOKEN_PII_INDEX_MAP,
    tokensIndex: null,
    note:
      "findByEmail queries the blind index FIRST and falls back to plaintext " +
      "equality, so legacy rows keep resolving while new ones are encrypted.",
  },
  {
    collection: "passwordResetTokens",
    label: "Password reset tokens",
    repository: "PasswordResetTokenRepository",
    fields: TOKEN_PII_FIELDS,
    fieldSource: "constant",
    indexMap: TOKEN_PII_INDEX_MAP,
    tokensIndex: null,
  },
  {
    collection: "eventEntries",
    label: "Event entries",
    repository: "EventEntryRepository",
    fields: EVENT_ENTRY_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note: "ipAddress is PII here and is encrypted; nothing queries by it.",
  },
  {
    collection: "lotteryEntries",
    label: "Giveaway entries",
    repository: "GiveawayEntryRepository",
    fields: GIVEAWAY_ENTRY_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note:
      "⚠ Collection name is `lotteryEntries`, NOT `giveawayEntries` — a deliberate, " +
      "documented data boundary the vocabulary rename stopped at.",
  },
  {
    collection: "savedPaymentMethods",
    label: "Saved payment methods",
    repository: "SavedPaymentMethodsRepository",
    fields: PAYMENT_METHOD_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note:
      "Moved to the write hook 2026-11-11. The `createWithId`/`update` overrides " +
      "that existed only to call a private encrypt() helper are DELETED — they " +
      "covered 2 of 9 write paths.",
  },
  {
    collection: "conversations",
    label: "Conversations",
    repository: "ConversationsRepository",
    fields: CONVERSATION_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    note:
      "`lastMessage.body` is a NESTED path. encryptPiiFields omits the blind index " +
      "for nested paths deliberately — nothing queries chat by body content.",
  },
  {
    collection: "messages",
    label: "Messages",
    repository: "MessagesRepository",
    enforcement: "explicit-call",
    enforcedIn: "features/messages/repository/messages.repository.ts",
    /*
     * 🛑 THE ONE REMAINING EXPLICIT-CALL COLLECTION, AND IT IS STRUCTURAL.
     *
     * "MessagesRepository" is not a repository at all — there is no class. It
     * is four free functions over
     * `conversations/{id}/messages/{msgId}`, because `BaseRepository`
     * hard-codes `db.collection(this.collection)` and has no subcollection
     * form, and `IDbProvider.getRepository(name)` takes a single collection
     * name so the generic `FirebaseRepository` cannot address one either.
     * There is no hook to declare anything on. Forcing it would mean giving
     * BaseRepository a parent-path concept, which is a change to every
     * repository in the platform to fix one module's enforcement style.
     *
     * ⚠ Measured mitigation, so this is a known weakness rather than an
     * unknown one: the subcollection has exactly TWO write paths —
     * `createMessage`, which encrypts, and `softDeleteMessage`, which writes
     * `body: ""` (a tombstone; `encryptPiiFields` skips empty strings, so
     * there is nothing to encrypt). Both are covered today. What is missing is
     * the GUARANTEE for a third one.
     */
    enforcementException:
      "conversations/{id}/messages is a SUBCOLLECTION. BaseRepository addresses " +
      "only top-level collections and IDbProvider.getRepository() takes one " +
      "collection name, so neither hook can reach it. Two write paths exist and " +
      "both encrypt; a THIRD would not be covered by default.",
    fields: MESSAGE_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    subcollectionOf: "conversations",
  },
  {
    collection: "products",
    label: "Products",
    repository: "ProductRepository",
    fields: PRODUCT_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    readsReturnCiphertext: true,
    note:
      "🛑 ADDED 2026-11-11, closing a deliberate omission. The seeder encrypted " +
      "sellerName/sellerEmail from its own SEEDER_ONLY_PII_FIELDS map while " +
      "ProductRepository declared nothing — so a SEEDED product carried " +
      "ciphertext and an app-created one carried plaintext, in one collection, " +
      "with nothing to tell them apart. The reason recorded for keeping it out " +
      "was that the storefront renders the seller name; measured, it does not " +
      "(see PRODUCT_PII_FIELDS). mapDoc does NOT decrypt — use " +
      "revealProduct/maskedProduct. Nothing queries either field, hence no " +
      "indexMap; the two DERIVED siblings encryptPiiFields writes are swept out " +
      "of every response by sanitizeProductForPublic/maskedProduct.",
  },
  {
    collection: "stores",
    label: "Stores",
    repository: "StoreRepository",
    fields: STORE_PII_FIELDS,
    fieldSource: "constant",
    indexMap: {},
    tokensIndex: null,
    readsReturnCiphertext: true,
    note:
      "mapDoc does NOT decrypt `pan` — reads return ciphertext and plaintext needs " +
      "the named revealPan accessor. A PAN is not a lookup key, so no index.",
  },

  /* ──────────────────────────────────────────────────────────────────────
   * TRANSCRIBED — the field list lives outside `security/` and is copied
   * here. `scripts/audit-pii-registry.mjs` asserts each copy still matches.
   * ────────────────────────────────────────────────────────────────────── */
  {
    collection: "supportTickets",
    label: "Support tickets",
    repository: "SupportRepository",
    /* 🛑 THE DEFECT: the seeder's own map omitted this, so 2/2 rows stored
     * `userEmail` in PLAINTEXT while the repository declared it PII. */
    fields: ["userEmail", "userDisplayName", "assignedToName"],
    fieldSource: "transcribed",
    transcribedFrom:
      "SUPPORT_TICKET_PII_FIELDS in features/support/schemas/firestore.ts",
    indexMap: {},
    tokensIndex: null,
    readsReturnCiphertext: true,
    note:
      "mapDoc is NOT overridden — reads return ciphertext and plaintext needs " +
      "revealTicket/maskedTicket. searchTxt covers `subject` only.",
  },
  {
    collection: "sessions",
    label: "Sessions",
    repository: "SessionRepository",
    fields: ["deviceInfo.ip", "deviceInfo.userAgent", "location.city"],
    fieldSource: "transcribed",
    transcribedFrom: "the inline `piiFields` array in SessionRepository",
    indexMap: {},
    tokensIndex: null,
    note:
      "All three are NESTED paths, so encryptPiiFields writes NO derived index " +
      "for any of them and a flat key read cannot check them.",
  },
  {
    collection: "catalogueItems",
    label: "Catalogue items",
    repository: "CatalogueRepository",
    fields: ["ownerEmail"],
    fieldSource: "transcribed",
    transcribedFrom: "the inline `piiFields` array in CatalogueRepository",
    indexMap: {},
    tokensIndex: null,
    note:
      "⚠ The collection is `catalogueItems`. backfill-pii.mjs once said " +
      "`catalogue`, which does not exist, and reported a clean `scanned 0`.",
  },
  {
    collection: "payoutMethods",
    label: "Payout methods",
    repository: "PayoutMethodsRepository",
    fields: ["upiVpa", "accountNumber", "ifscCode"],
    fieldSource: "transcribed",
    transcribedFrom:
      "PAYOUT_METHOD_PII_FIELDS in features/store-extensions/repository/store-extensions.repositories.ts",
    indexMap: {},
    tokensIndex: null,
  },
  {
    collection: "newsletterSubscribers",
    label: "Newsletter subscribers",
    repository: "NewsletterRepository",
    enforcement: "provider-hook",
    enforcedIn: "providers/db-firebase/base.ts",
    fields: ["email"],
    fieldSource: "transcribed",
    transcribedFrom:
      "the module-local NEWSLETTER_PII_FIELDS in NewsletterRepository",
    indexMap: { email: "emailIndex" },
    tokensIndex: null,
    note:
      "🛑 NewsletterRepository does NOT extend BaseRepository — it reaches " +
      "Firestore through IDbProvider.getRepository(), so THIS ENTRY is what " +
      "encrypts it: the generic FirebaseRepository resolves the policy by " +
      "collection name in its own applyWriteHooks. Until 2026-11-11 it encrypted " +
      "from a hand-written call in `subscribe` and nowhere else, and also wrote " +
      "`emailIndex` itself over `email.toLowerCase()` — a SECOND normalisation " +
      "that disagreed with piiIndicesFor. Both are gone; the index is now the " +
      "HMAC of the stored value, and `normalizeEmail` canonicalises the VALUE " +
      "at the one place it enters the collection.",
  },
];

/** Look one policy up by collection name. */
export function piiPolicyFor(collection: string): PiiCollectionPolicy | undefined {
  return PII_POLICIES.find((p) => p.collection === collection);
}

/**
 * The `` `${field}Index` `` siblings `encryptPiiFields` writes automatically.
 *
 * 🛑 This is the writer CLAUDE.md records as "unknown". It fires for every
 * TOP-LEVEL field, with no map involved and no way to opt out — dotted and
 * `[]` paths are skipped, which is why `sessions` and `conversations` carry no
 * index at all. Computed, never listed, so it cannot drift from the encryptor.
 */
export function derivedIndexFieldsFor(policy: PiiCollectionPolicy): string[] {
  return policy.fields
    .filter((f) => !f.includes(".") && !f.includes("["))
    .map((f) => `${f}Index`);
}

/**
 * Every index field name this platform writes for a collection, from all three
 * writers: the declarative map, the derived siblings, and the token index.
 *
 * 🛑 DO NOT USE THIS TO STRIP INDICES FROM AN API RESPONSE. A strip list built
 * from declarations misses whatever is not declared — that mistake has now been
 * made twice (`/api/admin/users` kept publishing `phoneNumberIndex`,
 * `/api/admin/payouts` kept publishing `sellerTokensIndex`, both in the commit
 * that "fixed" the leak). Strip with a `/Index$/` sweep, which fails closed.
 * This function is for CLASSIFYING an observation, nothing else.
 */
export function allIndexFieldsFor(policy: PiiCollectionPolicy): string[] {
  /*
   * 🛑 DEDUPED. The map and the derivation COINCIDE wherever a field's mapped
   * index name happens to equal `${field}Index` — `users.email → emailIndex`
   * and `reviews.userName → userNameIndex` both do. Without the `Set` the CMS
   * rendered `emailIndex` twice on the users card, which reads as a second,
   * different index and invites someone to go looking for it.
   */
  return [
    ...new Set([
      ...Object.values(policy.indexMap),
      ...derivedIndexFieldsFor(policy),
      ...(policy.tokensIndex ? [policy.tokensIndex.field] : []),
    ]),
  ];
}

/**
 * Which PLAINTEXT fields feed a given index field.
 *
 * 🛑 This is what makes "not applied" an honest verdict. An index is an HMAC of
 * its source, so a document whose source field is ABSENT cannot carry the index
 * and is not evidence of a missing migration. `googleLinkedEmail` is declared
 * PII, is present on no user, and therefore yields `googleLinkedEmailIndex` on
 * 0/20 — which the first version of the report rendered as "NOT applied" and
 * counted as a migration the operator owed. It owed nothing; there was nothing
 * to hash.
 *
 * Returns `[]` for a field this registry does not account for, which is the
 * `unexplained` case and must stay distinguishable from "no sources".
 */
export function indexSourceFieldsFor(
  policy: PiiCollectionPolicy,
  indexField: string,
): string[] {
  const sources = new Set<string>();
  for (const [source, mapped] of Object.entries(policy.indexMap)) {
    if (mapped === indexField) sources.add(source);
  }
  for (const field of policy.fields) {
    if (!field.includes(".") && !field.includes("[") && `${field}Index` === indexField) {
      sources.add(field);
    }
  }
  if (policy.tokensIndex?.field === indexField) {
    for (const source of policy.tokensIndex.from) sources.add(source);
  }
  return [...sources];
}

/** Which writer accounts for an observed index field. */
export type PiiIndexWriter =
  /** Named in the collection's `*_PII_INDEX_MAP`. */
  | "map"
  /** The `` `${field}Index` `` sibling `encryptPiiFields` always writes. */
  | "derived"
  /** The collection's `buildTokensIndexFor()` token index. */
  | "tokens"
  /** 🛑 In the data, explained by nothing in this registry. */
  | "unexplained";

/** Classify one observed index field against the policy. Never reads a value. */
export function classifyIndexField(
  policy: PiiCollectionPolicy,
  field: string,
): PiiIndexWriter {
  if (Object.values(policy.indexMap).includes(field)) return "map";
  if (derivedIndexFieldsFor(policy).includes(field)) return "derived";
  if (policy.tokensIndex?.field === field) return "tokens";
  return "unexplained";
}

/**
 * Fields a flat key read cannot honestly check.
 *
 * `maskPii` SKIPS `[]` paths outright and a dotted path is not a top-level
 * key, so a report that counted them would publish a confident zero for the
 * fields most likely to have been missed.
 */
export function notFlatlyCheckable(field: string): boolean {
  return field.includes("[]") || field.includes(".");
}

/**
 * Bumped BY HAND whenever a policy above changes in a way that needs a
 * backfill — a field added or removed, an index renamed, a token source
 * changed.
 *
 * 🛑 It is not a build stamp and must never be computed. Its only job is to
 * let an operator answer "is the data behind the config?" without re-deriving
 * the whole history: the CMS shows this number against what the sampled
 * documents actually carry, and they disagree until `pii-backfill.mjs` runs.
 */
export const PII_POLICY_VERSION = 3;

/**
 * What changed at each version, so the CMS can name the migration an operator
 * still owes rather than only that one exists.
 */
export const PII_POLICY_CHANGELOG: readonly {
  version: number;
  date: string;
  change: string;
  backfill: string;
}[] = [
  {
    version: 1,
    date: "2026-11-10",
    change: "Registry extracted; the five hand-maintained copies collapsed into it.",
    backfill: "none — a restatement of what was already declared",
  },
  {
    version: 2,
    date: "2026-11-10",
    change:
      "users/addresses token indices and supportTickets encryption are now " +
      "written by the SEEDER as well as the repository. Existing rows predate both.",
    backfill:
      "node appkit/scripts/pii-backfill.mjs --database dev-db --write",
  },
  {
    version: 3,
    date: "2026-11-11",
    change:
      "products ADDED (sellerName, sellerEmail) — the seeder-only map that " +
      "encrypted them outside this registry is deleted. Five collections moved " +
      "from explicit-call enforcement to a declarative hook (offers, " +
      "eventEntries, lotteryEntries, savedPaymentMethods via BaseRepository; " +
      "newsletterSubscribers via the generic provider repository). " +
      "newsletterSubscribers' second normalisation is gone.",
    backfill:
      "node appkit/scripts/pii-backfill.mjs --database dev-db --collections products --write" +
      "  (🛑 products is the only collection with data to migrate: every " +
      "seller- and admin-created listing stored both fields in PLAINTEXT. The " +
      "four enforcement moves change no stored shape, and the newsletter " +
      "normalisation change produces IDENTICAL digests because `subscribe` " +
      "already lowercased the stored value.)",
  },
];
