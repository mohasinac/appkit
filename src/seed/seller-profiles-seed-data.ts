/*
 * WHY: `sellerProfiles/{uid}` sidecar seed data — restores what `fb72d0605`
 *      moved off `users-seed-data.ts` (storeId/storeSlug/storeStatus) but
 *      never gave a seed home to, so a fresh reseed silently lost them.
 * WHAT: 2 docs, one per seeded seller-role owner, matching the real values
 *       `git show fb72d0605` recovers from the user records that used to
 *       carry them. No payoutDetails/shippingConfig — neither uid's seed
 *       record ever carried those fields, and seeding them here would write
 *       them as PLAINTEXT (the seed loader writes raw, bypassing
 *       `SellerProfileRepository.applyWriteHooks`'s encryption).
 *
 * EXPORTS:
 *   sellerProfilesSeedData — Array of SellerProfileSeedDocument for seed-cli
 *
 * @tag domain:seller
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,scripts/seed-cli.mjs
 * @tag sideEffects:none
 */

export interface SellerProfileSeedDocument {
  uid: string;
  storeId: string;
  storeSlug: string;
  storeStatus: "pending" | "approved" | "rejected";
}

export const sellerProfilesSeedData: SellerProfileSeedDocument[] = [
  {
    uid: "user-admin-letitrip",
    storeId: "store-letitrip-official",
    storeSlug: "store-letitrip-official",
    storeStatus: "approved",
  },
  {
    uid: "user-tyson-blader",
    storeId: "store-beyblade-arena",
    storeSlug: "store-beyblade-arena",
    storeStatus: "approved",
  },
];
