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
 * here and in `jobs/handlers/messages.ts` — with a comment as the only thing
 * keeping them equal, which is the drift shape Root Cause #42 describes.
 * `messages.ts` now re-exports this one.
 */
export const TEST_DATA_TTL_DAYS = 7;

export function testDataExpiresAt(): Date {
  return new Date(Date.now() + TEST_DATA_TTL_DAYS * 24 * 60 * 60 * 1000);
}
