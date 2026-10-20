/**
 * Seed/test PROVENANCE METADATA — the vocabulary, not the data.
 *
 * ── 🛑 WHY THIS IS IN `constants/` AND NOT IN `seed/` ─────────────────────
 *
 * `appkit/src/seed/` is **61% of this package's source bytes and 60% of the
 * published dist** — 540 files and 24.6 MB of pure fixture data that no
 * runtime code reads. It is being extracted into its own package so a purge,
 * a seed or a reseed stops requiring an appkit release, and so Turbopack stops
 * tracing a graph through 24 MB of object literals.
 *
 * Two things stood in the way, and both were in `seed/` by accident of
 * history rather than by nature:
 *
 *   · `TEST_DATA_TTL_DAYS` / `testDataExpiresAt()` — a job handler re-exports
 *     them, so the SWEEP that reclaims expired fixtures depended on the
 *     fixture data shipping alongside it.
 *   · `SeedPurpose` — `BaseDocument` carries the field, so the base type of
 *     every document in the system pointed into the seed directory.
 *
 * Neither is data. A TTL and a three-value union are metadata ABOUT seeding
 * that runtime code legitimately reads, so they live with the other shared
 * constants and `seed/` keeps only rows.
 *
 * 🛑 What deliberately did NOT move: `SEED_COLLECTION_PURPOSE`,
 * `SEED_ROW_PURPOSE` and `SEED_PURPOSE_DERIVED_FROM`. Those name specific
 * collections and specific seeded ids — they are registries over the data, so
 * they belong with it, and only `appkit-seed` and `audit-seed-purpose` read
 * them.
 */

/**
 * The TTL stamp every disposable test fixture must carry.
 *
 * 🛑 `isTestData: true` WITHOUT `testDataExpiresAt` means PERMANENT — nothing
 * ever reclaims it (see `jobs/handlers/_helpers.ts`, which documents the same
 * rule from the sweep's side). That is not a theoretical hazard: until
 * 2026-10-10 the only two `isTestData` rows in the whole seed,
 * `product-tester-crossstore-a` / `-b`, were in exactly that state — live in
 * the public catalogue of 72 products, never purged, and one of them was
 * `store-letitrip-official`'s ONLY buyable standard product, so it was hidden
 * from every real buyer by `hidePublicTestData` while being the only thing
 * that store had to sell. Both are deleted.
 *
 * And the reason they were permanent is that **this module had zero callers**.
 * The helper that enforces the rule existed, was documented as the rule that
 * matters most, and no fixture used it. So: a fixture's three obligations are
 * an id containing `-test-`, `isTestData: true`, and an expiry FROM HERE.
 *
 * Recomputed fresh on every seed run (seed files are re-imported per
 * invocation), so re-seeding naturally refreshes the expiry rather than
 * leaving a fixture that expired between runs.
 *
 * 🛑 Do NOT re-declare the day count elsewhere. It used to be declared twice —
 * in the seed directory and in `jobs/handlers/messages.ts` — with a comment as
 * the only thing keeping them equal, which is the drift shape Root Cause #42
 * describes. `messages.ts` re-exports this one.
 */
export const TEST_DATA_TTL_DAYS = 7;

export function testDataExpiresAt(): Date {
  return new Date(Date.now() + TEST_DATA_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Why a seeded row exists — i.e. what a purge is allowed to do with it.
 *
 * 🛑 Not a severity scale. Two different answers to one question: never, and
 * on request.
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
   * the public is `isTestData`, which is a separate decision.
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
   * about testing. Its 1,500-odd cases are no more disposable than the 85 FAQs.
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
 * dropdown and have never rendered.
 *
 * Two values answer the question that was actually asked. If a genuine third
 * case appears, add it then — with a row that needs it.
 */
export const PURGEABLE: Record<SeedPurpose, boolean> = {
  test: true,
  permanent: false,
};
