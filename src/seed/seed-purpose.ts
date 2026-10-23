/**
 * ── Seed provenance: may a purge delete this row? ───────────────────────────
 *
 * Every document written by `appkit-seed` carries a `seedPurpose`, and it is
 * the ONE declaration of whether a row is real content or clearable test data.
 * The purge reads it; nothing else decides.
 *
 * ## The rule this exists to enforce
 *
 * 🛑 **Content comes from a seed FILE, never from a direct database write.**
 * Not a one-off script, not a console paste, not a `node -e`. A row that exists
 * only in Firestore cannot be reviewed in a diff, cannot be recreated after a
 * purge, and cannot be found by anyone who did not watch it being written —
 * and when it references other rows, nothing updates it when those move.
 *
 * `seedPurpose` makes that rule *checkable*: a document with no `seedPurpose`
 * was not written by the seeder, so the purge will not touch it.
 *
 * ## 🛑 THE DEFAULT IS `test`, AND THE OPPOSITE WAS THIS FILE'S FIRST BUG
 *
 * The first version of this file defaulted every collection to `permanent`,
 * reasoning that the dangerous direction is deleting something unrecoverable.
 * **That reasoning was wrong here, and it made the purge a no-op.**
 *
 * This site has never gone live. There are no real customers, no real orders
 * and no real payouts — every user, store, listing, auction, order, bid and
 * review in the seed was added TO EXERCISE THE PLATFORM. Classifying them
 * `permanent` means "cannot be cleared", which is precisely the opposite of
 * why the field was asked for.
 *
 * So the default is `test`, and `permanent` is the **narrow** exception: the
 * handful of collections that are genuinely content rather than scaffolding.
 *
 * ## 🛑 AND `isTestData` IS NOT DERIVED FROM THIS — that was the second bug
 *
 * The first version wrote `isTestData: true` for every `test` row. That would
 * have **hidden the entire demo catalogue from the public**, because
 * `hidePublicTestData` filters on exactly that field — 70 products, 416
 * categories and every store would have vanished from every public page while
 * the summary line read `created 2513, errors 0`.
 *
 * The two concerns are orthogonal and must stay separate:
 *
 * | Question | Field |
 * |---|---|
 * | May a purge delete this row? | **`seedPurpose`** (here) |
 * | Should the public be able to SEE this row? | **`isTestData`** + `testDataExpiresAt` |
 *
 * A demo product is `test` (clearable) **and visible**. A tester-sandbox
 * cross-store fixture is `test` **and hidden**. Those are different rows with
 * different needs, and one field cannot answer both.
 *
 * `isTestData` therefore stays an explicit per-row opt-in, authored via
 * `testDataExpiresAt()` in `../constants/seed-meta.ts`, and this file never writes it.
 *
 * ## What it replaces
 *
 * Measured 2026-10-12, before this file existed: **47** seed data files, of
 * which **one** carried any permanence marker; `isTestData` declared on **5**
 * schemas; and `TEST_DATA_COLLECTIONS` listing **`offers`**, whose schema does
 * not declare the field at all, so that entry could only ever match zero rows.
 * `users`, `orders`, `faqs`, `reviews`, `bids`, `payouts` and `carts` had no
 * marker and no purge path — and users and orders are the two that were named.
 */

/*
 * ── 🛑 THE VOCABULARY MOVED; THE REGISTRIES STAYED ────────────────────────
 *
 * `SeedPurpose`, `SEED_PURPOSE_VALUES`, `ALL_SEED_PURPOSES`,
 * `isSeedPurpose` and `PURGEABLE` now live in
 * `appkit/src/constants/seed-meta.ts`, with their full reasoning.
 *
 * They had to leave because `BaseDocument` carries the `seedPurpose` field,
 * so the base type of EVERY document in the system imported from this
 * directory — and this directory is 61% of the package's source bytes in pure
 * fixture data that is being extracted into its own package. A two-value union
 * is metadata about seeding, not seed data.
 *
 * What stayed is everything that names a specific COLLECTION or a specific
 * seeded ID — registries over the data, read only by `appkit-seed` and
 * `audit-seed-purpose`. Those belong beside the rows they describe.
 */
import {
  type SeedPurpose,
  SEED_PURPOSE_VALUES,
  ALL_SEED_PURPOSES,
  isSeedPurpose,
  PURGEABLE,
  TEST_DATA_TTL_DAYS,
} from "../constants/seed-meta";

/*
 * Re-exported so existing importers of this module keep working unchanged.
 * 🛑 These are re-exports of a MOVED declaration, not a second definition —
 * two declarations of one union is the drift shape Root Cause #42 describes,
 * and it is exactly what the duplicated TTL day-count used to be.
 */
export { SEED_PURPOSE_VALUES, ALL_SEED_PURPOSES, isSeedPurpose, PURGEABLE };
export type { SeedPurpose };


/**
 * The per-collection default, keyed on `COLLECTION_MAP`'s keys in
 * `appkit/scripts/seed-cli.mjs`.
 *
 * 🛑 Typed `Record<string, SeedPurpose>` rather than a closed union of
 * collection names, and that is a deliberate trade: the collection list lives
 * in a `.mjs` script that cannot be imported for its types, so a closed union
 * here would be a fifth hand-written copy of it — the thing this file exists to
 * stop. `audit-seed-purpose` cross-checks the two sets instead, which catches
 * both a missing entry and a dead one.
 *
 * **Anything absent defaults to `test`**, so a collection added later is
 * clearable rather than quietly permanent. That is the right fail direction on
 * a site with no real data: the cost of clearing something re-seedable is one
 * command, and the cost of being unable to clear it is the state this replaced.
 */
export const SEED_COLLECTION_PURPOSE: Record<string, SeedPurpose> = {
  /*
   * ── permanent: content, not scaffolding ─────────────────────────────────
   *
   * The test: if clearing it means someone has to WRITE it again rather than
   * re-run a loader, it is permanent. Five collections pass that test.
   */

  /* 85 answers carrying real figures — the ₹10 fee cap, the 5% GST worked
   * example, the 48-hour damage window. Explicitly asked to be permanent. */
  faqs: "permanent",
  /* 416 nodes, 6 roots. Every product's `categorySlugs` chain points into it,
   * so clearing it orphans the catalogue — which is exactly what happened when
   * a purge-then-load wrote 0 of 416 and 70 products pointed at nothing. */
  categories: "permanent",
  /* Real HSN codes and GST rates. A wrong rate on a real invoice is a
   * compliance matter, not a fixture. */
  taxCodes: "permanent",
  /* 🛑 Every `journalEntries.lines[].accountCode` points in here, and a
   * journal line naming a code with no account is an entry no report can
   * classify — it silently drops out of the trial balance rather than
   * failing. Clearing this does not lose fixtures, it orphans the books.
   * Same argument as `mediaAssets`, where a wipe left 504 Storage objects
   * nothing could resolve and 1,134 requests 404ing with no error anywhere. */
  chartOfAccounts: "permanent",
  /* The `/media/<shortId>` -> Storage-path index. 195 rows back the taxonomy
   * cover images, and `categories` above is permanent for the same reason:
   * clearing these orphans the BUCKET — every category cover 404s while its
   * object sits untouched in Storage, and no amount of re-running the loader
   * brings it back without re-uploading. Permanent is also what stops
   * `isTestData` being derived onto them, which would hide every cover from
   * the public via `hidePublicTestData`. */
  mediaAssets: "permanent",
  /* The ~169-term feature vocabulary: condition, authenticity, release, type,
   * spin, grade, chase. Hand-curated from the crawl. */
  productFeatures: "permanent",
  /*
   * The buyer-facing dispute reason list. Permanent because it ACCUMULATES
   * from real cases — staff add rows as genuine gaps appear, and those
   * additions exist nowhere else. Re-running the loader restores the eleven
   * seeded rows and silently loses every reason an agent wrote since.
   *
   * It is also named on live disputes. The order snapshots the LABEL, so a
   * buyer's record survives a wipe either way — but the list's own history
   * (who added which wording, and when) does not.
   */
  disputeReasons: "permanent",
  /*
   * ── the inventory triple is deliberately ABSENT ──────────────────────────
   *
   * I classified `storageBoxes` / `inventoryPlacements` / `inventoryMovements`
   * as `permanent` here, with a long argument for why clearing them would be
   * unrecoverable. The argument was right and the entries were still wrong:
   * **`appkit-seed` does not load any of the three**, so they had no rows for
   * a purge to consider and the entries matched nothing.
   *
   * That is not harmless. This file's own header settles it — *"a document
   * with no `seedPurpose` was not written by the seeder, so the purge will not
   * touch it"* — so the three are protected by never having been seeded, and
   * the entries added no protection whatsoever. What they added was the
   * appearance of coverage: a reader checking "are the inventory collections
   * safe from a purge?" found a confident `permanent` beside a paragraph of
   * reasoning, and would have had no way to learn that nothing consults it.
   * That is the `offers` defect in `TEST_DATA_COLLECTIONS` exactly (Root Cause
   * #90), and `audit-seed-purpose`'s COLLECTION_DEAD rule exists to catch it.
   *
   * 🛑 If seed fixtures are ever added for any of the three, classify it in
   * the same commit — at that point the entry becomes load-bearing, and
   * `inventoryMovements` especially: the repository overrides `update` and
   * `delete` to throw so history cannot be rewritten, and a purge would do in
   * one command what it refuses one row at a time.
   */
  /*
   * The box-code tables and generation summaries. `permanent` because they
   * are reference data compiled from archived primary sources, not exercise
   * fixtures — a purge that cleared them would leave an admin with no way to
   * answer "what do we say about this code" short of re-running a generator.
   */
  authenticityKnowledge: "permanent",
  /* Branding, fees, commissions, watermark, legal pages, and the AES-encrypted
   * credentials. 🛑 A purge here would destroy live API keys. */
  siteSettings: "permanent",

  /*
   * ── permanent, second tranche: the site's own CONTENT and COMPOSITION ────
   *
   * Added on the user's explicit list. The same test applies and they pass it:
   * clearing any of these means re-AUTHORING, not re-running a loader.
   *
   * 🛑 But "permanent" obliges us to make them REAL — see G1c in the plan.
   * Marking a placeholder permanent only makes the placeholder unpurgeable, so
   * each of these has to trace to a crawl source: blogPosts to the buying/rules
   * guide split, homepageSections to worldhobbyshop's generation tiles and
   * 25-link systems matrix, carouselSlides to beybladeartshop's 5-slide hero
   * including the anti-counterfeit slide.
   */
  blogPosts: "permanent",
  carousels: "permanent",
  carouselSlides: "permanent",
  homepageSections: "permanent",

  /*
   * 🛑 The tester checklist cases are PERMANENT CONTENT, not scaffolding.
   *
   * 1,162 authored cases, each a six-part procedure with an explicit
   * before → after — the real catalogue of issues the testers test against and
   * keep updating. Clearing them is not a re-seed, it is losing the authoring,
   * and this project's primary quality gate is that catalogue.
   *
   * Their RESPONSES are the opposite: per-run verdicts, regenerated every
   * sweep, and the whole point of clearing between runs. So the two halves of
   * one feature land in different tiers, which is the case the collection-level
   * default is for.
   */
  testerChecklistItems: "permanent",
  /*
   * E4/D12 — PERMANENT. These are extracted from a corpus by committed
   * scripts, not fixtures: clearing them means re-running an extraction over a
   * 7 GB local crawl, which is the test § G1c sets ("if clearing it means
   * somebody has to WRITE it again rather than re-run a loader"). Re-running
   * the extractor is possible but needs a corpus a clone will not have.
   */
  partGlossary: "permanent",
  /*
   * PERMANENT, for the reason `partGlossary` is: these are extracted from a
   * crawled corpus by committed scripts, not fixtures. Clearing them means
   * re-running an extraction over a local crawl a clone will not have, which
   * is the test § G1c sets — "if clearing it means somebody has to WRITE it
   * again rather than re-run a loader".
   */
  beys: "permanent",
  beyProducts: "permanent",
  modelComposition: "permanent",
  testerChecklistResponses: "test",

  /*
   * ── test: everything else ───────────────────────────────────────────────
   *
   * Listed explicitly rather than left to the fallback, because an explicit
   * table is reviewable and `audit-seed-purpose` can then tell a MISSING entry
   * from a deliberate one.
   */
  users: "test",
  addresses: "test",
  storeAddresses: "test",
  sessions: "test",
  stores: "test",
  products: "test",
  orders: "test",
  reviews: "test",
  bids: "test",
  offers: "test",
  carts: "test",
  wishlists: "test",
  history: "test",
  payouts: "test",
  coupons: "test",
  couponUsage: "test",
  notifications: "test",
  supportTickets: "test",
  catalogueItems: "test",
  events: "test",
  eventEntries: "test",
  groupedListings: "test",
  scammerProfiles: "test",
  /*
   * 🛑 PERMANENT since 2026-10-21 — these three were `"test"`, i.e. deleted by
   * `appkit-seed delete`.
   *
   * They hold the only real LANDED-COST data in the system: what a shipment
   * from Japan actually cost, per lot, including customs and labour. That is
   * purchase history — a fact about money that left the business — and it is
   * the foundation of COGS, actual-vs-projected margin, and the whole
   * double-entry books phase.
   *
   * A reseed wiped the books, silently, and reported success. Nothing could
   * detect it afterwards either: `appkit-seed status` counts documents by id,
   * so once they were gone it would simply report the seed's own fixtures as
   * in sync.
   *
   * 🛑 `seedPurpose` is only HALF the protection. The Claude tester has an
   * independent tier system (`tester/scripts/lib/collections.mjs`), and a
   * collection needs to be safe in BOTH — `assertDeletable` throws on an
   * unlisted name, so these must be named in its PRESERVE tier too, not left
   * to a default. Two unlinked systems, both required.
   */
  procurementShipments: "permanent",
  shipmentLots: "permanent",
  shipmentItems: "permanent",
  payoutMethods: "test",
  analyticsAlerts: "test",
  storeCategories: "test",
  listingTemplates: "test",
  moderationQueue: "test",
  reports: "test",
  itemRequests: "test",
  storeGoogleConfig: "test",
};

/**
 * Individual rows that differ from their collection's default, by document id.
 *
 * 🛑 This is the "clear all out EXCEPT our admin creds and the original single
 * store" instruction, made declarative. Both collections default to `test` —
 * every persona and every other store is disposable — and exactly two rows are
 * not.
 *
 * ✅ The precedent already existed and this replaces it: `cmdDelete` has
 * carried `PROTECTED_USER_UIDS = new Set(["user-admin-letitrip"])` for a long
 * time, skipping that uid on a wholesale delete. One mechanism is better than a
 * list the purge path happens to know about privately.
 *
 * 🛑 Keyed **`"<collection>:<id>"`**, and the collection half is load-bearing.
 *
 * It was a bare id, and a live read-back caught the consequence: `carts`,
 * `wishlists` and `history` are all keyed on the USER id (CLAUDE.md: "Doc id =
 * userId"), so `"user-admin-letitrip"` matched the admin's **cart** as well as
 * the admin's user row — making a disposable cart permanently unpurgeable.
 * Subtle, silent, and it would have left a stale cart surviving every purge
 * forever.
 *
 * The id half is the DOCUMENT id, which for `users` is the Auth uid (`uid` on
 * the seed row) and for everything else is `id`. `resolveSeedPurpose` checks
 * both, because a seeded user row carries `uid` and no `id`.
 */
export const SEED_ROW_PURPOSE: Record<string, SeedPurpose> = {
  /* Our own admin account. Clearing it locks us out of our own site — and the
   * Auth record is the half most easily missed, since `appkit-seed delete` does
   * not touch Firebase Auth at all. */
  "users:user-admin-letitrip": "permanent",
  /* The platform's own default store. The other three seeded stores
   * (beyblade-arena, blader-bazaar, vintage-vault-co) are test fixtures. */
  "stores:store-letitrip-official": "permanent",
  /*
   * ── 🛑 THE ONLY GENUINELY PURCHASABLE PRODUCTS ─────────────────────────
   *
   * 12 real, wiki-verified Beyblade X listings under
   * `store-letitrip-official`, added 2026-10-19 because PhonePe's merchant
   * review requires at least one genuinely purchasable product.
   *
   * `products` is a PURGEABLE collection, and these had no row override — so
   * `appkit-seed purge` would have deleted the entire reason the payment
   * provider approved the account, while leaving the permanent store that
   * sells them standing and empty.
   *
   * 🛑 Their STORE is already permanent, which is what makes marking these
   * rows permanent legal: rule 1 of this file is that a permanent row may
   * not reference a test row. Marking a product permanent while its seller
   * stays purgeable would strand it as a dangling FK that still reads as a
   * real listing — the exact failure `SEED_PURPOSE_DERIVED_FROM` exists for.
   *
   * Generated from the ids in `products-beyblade-x-seed-data.ts` rather than
   * retyped; a hand-kept mirror of a 12-row list drifts on the first addition
   * (Root Cause #42).
   */
  "products:product-beyblade-x-aeropegasus-3-70a": "permanent",
  "products:product-beyblade-x-valkyrievolt-s4-70v": "permanent",
  "products:product-beyblade-x-cobaltdrake-4-60f": "permanent",
  "products:product-beyblade-x-phoenixwing-9-60gf": "permanent",
  "products:product-beyblade-x-xtreme-stadium-bx-10": "permanent",
  "products:product-beyblade-x-bx-53-all-in-one-set": "permanent",
  "products:product-beyblade-x-bx-53-aeropegasus-dmc": "permanent",
  "products:product-beyblade-x-bx-53-wizardarrow-v2": "permanent",
  "products:product-beyblade-x-bx-53-knightshield-v2": "permanent",
  "products:product-beyblade-x-bx-53-winder-launcher": "permanent",
  "products:product-beyblade-x-bx-53-string-launcher": "permanent",
  "products:product-beyblade-x-bx-53-xtreme-stadium-variant": "permanent",
};

/**
 * Collections whose purpose FOLLOWS a referenced row rather than being declared.
 *
 * 🛑 This exists to hold one invariant: **a `permanent` row may not reference a
 * `test` row**, because the purge would leave it behind as a dangling FK that
 * still looks like real config.
 *
 * Measured in `store-extensions-seed-data.ts`: **14** rows reference
 * `store-beyblade-arena` (test) and **9** reference `store-letitrip-official`
 * (permanent). So marking `shippingConfigs` / `analyticsCards` permanent at the
 * COLLECTION level — which the user's list implies and an earlier draft of the
 * plan did — would strand 14 rows pointing at a store the purge deletes.
 *
 * Deriving is better than 23 hand-maintained per-row overrides for the usual
 * reason: a hand-kept mirror drifts the moment a store is added (Root Cause
 * #42), and a derivation is correct for stores that do not exist yet.
 */
export const SEED_PURPOSE_DERIVED_FROM: Record<
  string,
  { readonly field: SeedReferenceField; readonly collection: string }
> = {
  shippingConfigs: { field: "storeId", collection: "stores" },
  /*
   * 🛑 `ownerId` → `users`, NOT `storeId` → `stores`. I wrote the store form
   * first and the data disproved it: measured, `analyticsCardsSeedData` carries
   * **zero** `storeId` fields — every row is `{ scope: "seller", ownerId:
   * "user-tyson-blader", … }`. So these follow the USER whose dashboard they
   * compose, and since that user is a test persona all nine correctly resolve
   * `test`.
   *
   * Worth recording because the wrong field does not error: a derived row whose
   * named field is absent falls to `test`, which happened to be the right
   * answer here and would have silently been the WRONG one for a card owned by
   * the admin.
   */
  analyticsCards: { field: "ownerId", collection: "users" },
};

/** A seeded row may override its collection's default inline. */
export interface WithSeedPurpose {
  seedPurpose?: SeedPurpose;
}

/**
 * The fields `resolveSeedPurpose` reads off a row — all optional, because it is
 * handed rows from 47 differently-shaped collections.
 *
 * 🛑 Declared explicitly rather than as `Record<string, unknown>`, which
 * `audit-unknown-leakage` blocks and which is worse anyway: an index signature
 * accepts ANY field name, so a typo in `SEED_PURPOSE_DERIVED_FROM.field` would
 * read `undefined` and fall through to `test` silently — the exact mistake
 * already made once, where `analyticsCards` was declared to derive from
 * `storeId` and the rows carry `ownerId`.
 *
 * `SeedReferenceField` then constrains that `field` to one of these, so the
 * same typo becomes a compile error.
 */
export interface SeedRowIdentity extends WithSeedPurpose {
  /** Document id, on every collection except `users`. */
  id?: string;
  /** `users` seed rows carry the Auth uid and no `id`. */
  uid?: string;
  storeId?: string;
  ownerId?: string;
  userId?: string;
  sellerId?: string;
}

/** The reference fields a derived collection may follow. */
export type SeedReferenceField = "storeId" | "ownerId" | "userId" | "sellerId";

/**
 * Resolution order, most specific first:
 *
 *   1. the row's own inline `seedPurpose`
 *   2. a per-row override in `SEED_ROW_PURPOSE`, by `id` or `uid`
 *   3. for a DERIVED collection, the purpose of the row it references
 *   4. the collection default
 *   5. `test`
 *
 * 🛑 Step 3 is what holds the referential invariant. A `shippingConfig` for
 * `store-letitrip-official` resolves `permanent`; one for
 * `store-beyblade-arena` resolves `test` and is purged alongside the store it
 * configures, rather than outliving it.
 */
export function resolveSeedPurpose(
  collection: string,
  row?: SeedRowIdentity | null,
  /**
   * The document id, when the caller has it and the row does not.
   *
   * 🛑 Required by `loadGeneric`, which does `let { id, ...data } = docData`
   * and therefore hands this function a row with **no `id` at all**. Without
   * this parameter the per-row overrides silently did not apply: measured,
   * `store-letitrip-official` loaded as `test` — i.e. the platform's own store
   * would have been purged, which is exactly the row the keep-list exists to
   * protect. `loadUsers` was unaffected because `{ ...u }` keeps `uid`, which
   * is why the admin override worked and the store one did not.
   */
  docId?: string | null,
): SeedPurpose {
  if (row && isSeedPurpose(row.seedPurpose)) return row.seedPurpose;

  /* `"<collection>:<id>"` — the collection half is what stops a users
   * override also matching that user's CART, which is keyed on the same id. */
  const rowKey = (coll: string, id: string) => `${coll}:${id}`;
  if (docId && isSeedPurpose(SEED_ROW_PURPOSE[rowKey(collection, docId)]))
    return SEED_ROW_PURPOSE[rowKey(collection, docId)]!;

  if (row) {
    /* `users` seed rows carry `uid` and no `id`; everything else carries `id`. */
    const ownId = typeof row.id === "string" ? row.id : typeof row.uid === "string" ? row.uid : null;
    if (ownId && isSeedPurpose(SEED_ROW_PURPOSE[rowKey(collection, ownId)]))
      return SEED_ROW_PURPOSE[rowKey(collection, ownId)]!;

    const derived = SEED_PURPOSE_DERIVED_FROM[collection];
    if (derived) {
      const refId = row[derived.field];
      if (typeof refId === "string") {
        const refOverride = SEED_ROW_PURPOSE[rowKey(derived.collection, refId)];
        if (isSeedPurpose(refOverride)) return refOverride;
        const refDefault = SEED_COLLECTION_PURPOSE[derived.collection];
        return isSeedPurpose(refDefault) ? refDefault : "test";
      }
      /*
       * A derived row with no reference cannot inherit, and guessing
       * `permanent` would be the dangling-FK failure this map exists to
       * prevent. `test` is the safe answer: it is re-seedable.
       */
      return "test";
    }
  }

  const declared = SEED_COLLECTION_PURPOSE[collection];
  return isSeedPurpose(declared) ? declared : "test";
}

export interface SeedPurposeFields {
  seedPurpose: SeedPurpose;
}

/**
 * The fields to write for a purpose — exactly one.
 *
 * 🛑 It does **not** touch `isTestData` or `testDataExpiresAt`, and that
 * restraint is the whole correction described in the header: deriving
 * `isTestData` from `test` would have hidden every seeded product, category and
 * store from the public site while reporting a clean load.
 *
 * Kept as a function rather than inlined so there is one place to look when
 * someone asks "what does a purpose actually write?", and so the next field
 * (if one is ever justified) lands in one place.
 */
export function seedPurposeFields(purpose: SeedPurpose): SeedPurposeFields {
  return { seedPurpose: purpose };
}

/**
 * Stamp a row for writing. The one function every loader calls, so the CLI and
 * `runSeed` cannot disagree about what a purpose means — Root Cause #75's shape
 * on the seed axis (a rule reachable by copy-paste gets copied, and the copy
 * made before a branch was added never learns about it).
 *
 * Returns a NEW object; the seed arrays are module-level constants re-imported
 * on every CLI invocation and must not be mutated.
 */
export function stampSeedPurpose<T extends WithSeedPurpose>(
  collection: string,
  row: T,
  /** Pass this whenever the caller holds the id and the row does not — see
   *  `resolveSeedPurpose`'s `docId` for why `loadGeneric` must. */
  docId?: string | null,
): T & SeedPurposeFields {
  /*
   * The cast is to `Record<string, unknown>` only, which is a WIDENING — every
   * object satisfies it structurally, and `resolveSeedPurpose` reads `id`,
   * `uid` and the derived `field` with `typeof` guards rather than trusting the
   * type. 🛑 Deliberately NOT `as any`: that would silence the `collection`
   * argument's check too, which is the mistake the plan records at the
   * `sendNotification`/`as never` sites.
   */
  const purpose = resolveSeedPurpose(
    collection,
    row as SeedRowIdentity,
    docId,
  );
  return { ...row, ...seedPurposeFields(purpose) };
}

/**
 * Mark a whole array as something other than its collection default — the
 * readable way to say "this file is permanent" (or "this file is fixtures")
 * without repeating the field on every row.
 *
 * Sets the row-level override, so it beats the collection default and is
 * visible at the call site.
 */
export function asSeedPurpose<T>(
  purpose: SeedPurpose,
  rows: readonly T[],
): Array<T & WithSeedPurpose> {
  return rows.map((row) => ({ ...row, seedPurpose: purpose }));
}

/**
 * How long a `test` row survives before a purge may take it.
 *
 * 🛑 STOP-GAP, added 2026-10-12 to unbreak the build — NOT a design decision,
 * and whoever owns `seedPurpose` should replace it with the real declaration.
 *
 * This file arrived with `src/seed/index.ts:247` and `src/index.ts:1935` ALREADY
 * re-exporting `SEED_TEST_TTL_DAYS` from here while nothing declared it, so
 * `tsc` failed with TS2305 and appkit did not compile at all — the half-finished
 * public-surface rename of Root Cause #20, where the barrel landed without the
 * definition. (The same commit also carried `sxdexport const` on line 149,
 * i.e. stray keystrokes, which is the likelier reading of what happened here.)
 *
 * Aliased to the EXISTING value rather than given a fresh number: a retention
 * window is a product decision and inventing one would have been worse than the
 * compile error. `TEST_DATA_TTL_DAYS` is 7 and is what `testDataExpiresAt()`
 * already stamps on every test row, so this is behaviour-preserving by
 * construction — and when the two names are reconciled, there is exactly one
 * number to change.
 */
export { TEST_DATA_TTL_DAYS as SEED_TEST_TTL_DAYS };
