/**
 * The one place a product's denormalized store fields are derived.
 *
 * `ProductDocument.storeName` / `.storeSlug` are what every listing card renders
 * as "by …". They have to be denormalized, because the public browse query
 * (`listPublicProducts`) never touches `storeRepository` — a card gets the name
 * only if the document already carries it.
 *
 * They were optional and effectively never written: the seller wizard, the three
 * `create*Action` server actions and the appkit products route all set `storeId`
 * and stopped there, so only seed data and the admin route ever produced a
 * product with a store name on it. A seeded environment therefore looked correct
 * and production did not — every real seller listing rendered a card with no
 * seller on it.
 *
 * `cart-actions.ts` already carries a private copy of this idea (`resolveStoreName`),
 * written to paper over the same gap one layer downstream. That is deliberately
 * left alone: it resolves at ADD time from whatever the product happens to hold,
 * which is still the correct last line of defence for carts built from products
 * that predate this. This module fixes the source instead.
 */

import { storeRepository } from "../../../../features/stores/repository/store.repository";
import { safeRead } from "../../../../errors/safe-read";

export interface ProductStoreFields {
  storeName: string;
  storeSlug: string;
}

/**
 * Resolve the display fields for one store.
 *
 * Degrades rather than throws — a listing that saves without its seller's
 * display name is a cosmetic defect on a card, while a create that 500s because
 * the store lookup blipped is a seller who cannot list. `storeId` IS the store
 * slug in this codebase (see the store identity note in CLAUDE.md), so falling
 * back to it yields a working link and a readable-if-ugly label, never a blank.
 */
export async function resolveStoreFields(
  storeId: string,
  route: string,
): Promise<ProductStoreFields> {
  const store = await safeRead(() => storeRepository.findById(storeId), {
    route,
    key: "stores.findById",
    fallback: null,
  });
  return {
    storeName: store?.storeName ?? storeId,
    storeSlug: store?.storeSlug ?? storeId,
  };
}

/**
 * Batch form, for the backfill job and the rename re-sync.
 *
 * Sequential rather than `Promise.all` on purpose: the caller is a background
 * job over a whole catalogue, distinct stores are few (the grouping is what
 * makes this cheap), and a burst of parallel reads is exactly the shape Rule #6
 * asks not to write.
 */
export async function resolveStoreFieldsMany(
  storeIds: Iterable<string>,
  route: string,
): Promise<Map<string, ProductStoreFields>> {
  const out = new Map<string, ProductStoreFields>();
  for (const storeId of new Set(storeIds)) {
    out.set(storeId, await resolveStoreFields(storeId, route));
  }
  return out;
}
