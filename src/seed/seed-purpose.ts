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
 * `testDataExpiresAt()` in `./test-data-ttl.ts`, and this file never writes it.
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

/**
 * Why a seeded row exists — i.e. what a purge is allowed to do with it.
 *
 * 🛑 Not a severity scale. Three different answers to one question: never,
 * on request, and only on an explicit full purge.
 */
export type SeedPurpose =
  /**
   * Clearable test data. **The default**, and what almost everything is.
   *
   * Users, stores, listings, auctions, orders, bids, reviews, offers, carts,
   * payouts — everything seeded to exercise a path rather than to be read as
   * content. `appkit-seed purge` removes these and nothing else.
   *
   * 🛑 `test` says nothing about PUBLIC VISIBILITY. A demo product is `test`
   * and fully visible; that is what makes the demo a demo. Hiding a row from
   * the public is `isTestData`, which is a separate decision (see the header).
   */
  | "test"
  /**
   * Real content. **A purge must NEVER remove it**, because re-creating it is
   * not a re-seed, it is authoring.
   *
   * The test to apply: *if clearing this means somebody has to WRITE it again
   * rather than re-run a loader, it is permanent.*
   *
   * That is why the **tester checklist cases** are in here and not in some
   * harness tier — they are the real catalogue of issues the testers test
   * against and keep updating, which is authored content that happens to be
   * about testing. Its 1,162 cases are no more disposable than the 85 FAQs.
   */
  | "permanent";

/**
 * `Record<SeedPurpose, true>`, so a third value is a compile error in every map
 * keyed on the union rather than a silent gap (Root Cause #61).
 */
export const SEED_PURPOSE_VALUES: Record<SeedPurpose, true> = {
  test: true,
  permanent: true,
};

export const ALL_SEED_PURPOSES = Object.keys(SEED_PURPOSE_VALUES) as SeedPurpose[];

export function isSeedPurpose(value: unknown): value is SeedPurpose {
  return typeof value === "string" && value in SEED_PURPOSE_VALUES;
}

/**
 * 🛑 There is deliberately NO third `fixture` tier.
 *
 * An earlier draft had one, meaning "clearable but only by an explicit full
 * purge", intended for the tester checklist. Once the cases were correctly
 * classified as permanent content it had **nothing in it** — and a union member
 * with no members is the dead-enum-value shape this codebase keeps paying for:
 * a filter chip whose value no row carries returns zero rows forever and reads
 * as a working control (Root Cause #33), and nine section types that exist in a
 * dropdown and have never rendered (F1 #20).
 *
 * Two values answer the question that was actually asked. If a genuine third
 * case appears, add it then — with a row that needs it.
 */
export const PURGEABLE: Record<SeedPurpose, boolean> = {
  test: true,
  permanent: false,
};

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
sxdexport const SEED_COLLECTION_PURPOSE: Record<string, SeedPurpose> = {
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
  /* The ~169-term feature vocabulary: condition, authenticity, release, type,
   * spin, grade, chase. Hand-curated from the crawl. */
  productFeatures: "permanent",
  /* Branding, fees, commissions, watermark, legal pages, and the AES-encrypted
   * credentials. 🛑 A purge here would destroy live API keys. */
  siteSettings: "permanent",

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
  blogPosts: "test",
  events: "test",
  eventEntries: "test",
  groupedListings: "test",
  scammerProfiles: "test",
  carousels: "test",
  carouselSlides: "test",
  homepageSections: "test",
  procurementShipments: "test",
  shipmentLots: "test",
  shipmentItems: "test",
  payoutMethods: "test",
  shippingConfigs: "test",
  analyticsCards: "test",
  analyticsAlerts: "test",
  storeCategories: "test",
  listingTemplates: "test",
  moderationQueue: "test",
  reports: "test",
  itemRequests: "test",
  storeGoogleConfig: "test",
};

/** A seeded row may override its collection's default inline. */
export interface WithSeedPurpose {
  seedPurpose?: SeedPurpose;
}

/**
 * The row's own declaration wins; otherwise the collection default; otherwise
 * `test`.
 */
export function resolveSeedPurpose(
  collection: string,
  row?: WithSeedPurpose | null,
): SeedPurpose {
  if (row && isSeedPurpose(row.seedPurpose)) return row.seedPurpose;
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
): T & SeedPurposeFields {
  return { ...row, ...seedPurposeFields(resolveSeedPurpose(collection, row)) };
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
