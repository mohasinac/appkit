/**
 * Bundle server actions — appkit internal.
 *
 * `addBundleToCartAction` is the shared business logic called by the
 * consumer's `"use server"` wrapper. The consumer is responsible for:
 *   1. Resolving the authenticated userId (throw AuthError when unauthenticated
 *      so BundleBuyNowCta's isAuthError guard shows the login modal).
 *   2. Calling redirect(ROUTES.PUBLIC.CHECKOUT) after this returns.
 *
 * Bundles are categoryType:"bundle" rows — they bypass the regular
 * addItemToCart capability gate and write directly to cartRepository with
 * bundleCategorySlug + bundleProductIds so checkout's bundle-expansion
 * helpers can fan out stock decrements to member products.
 */

import { NotFoundError, ValidationError } from "../../../../errors";
import { categoriesRepository } from "../../../../repositories";
import { cartRepository } from "../../../../features/cart/repository/cart.repository";
import { assertCanAddNewItems } from "../../../../features/cart/actions/cart-actions";
import { productRepository } from "../../../../features/products/repository/products.repository";
import { normalizeListingType } from "../../../../features/products/utils/listing-type";
import { getDefaultCurrency } from "../../../../core/baseline-resolver";
import type { CartLineMember } from "../../../../features/cart/schemas/firestore";

export async function addBundleToCartAction(
  userId: string,
  bundleSlug: string,
  /** Number of COPIES of the whole bundle. Bundles are all-or-nothing, so this
   *  is the only quantity a buyer can change — member quantities are fixed. */
  quantity = 1,
): Promise<void> {
  if (!userId) throw new ValidationError("User id is required");
  if (!bundleSlug) throw new ValidationError("Bundle slug is required");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new ValidationError("Choose between 1 and 99 copies of this bundle.");
  }

  const bundle = await categoriesRepository.findBySlugAndType(
    bundleSlug,
    "bundle",
  );
  if (!bundle) throw new NotFoundError("Bundle not found");
  if (!bundle.isActive) throw new ValidationError("Bundle is not available");
  if (bundle.bundleStockStatus === "out_of_stock") {
    throw new ValidationError("Bundle is currently out of stock");
  }
  if (!bundle.bundlePrice || bundle.bundlePrice < 1) {
    throw new ValidationError("Bundle price is not configured");
  }

  // Bundles bypass `addItemToCart`'s capability gate deliberately (a bundle's
  // `listingType: "standard"` is a lie told to satisfy it — `bundleRule` is
  // `cartEligible: false`). The LANE gate is not optional though, and this path
  // silently skipped it: a buyer with an unpaid auction win could keep shopping
  // by adding bundles.
  await assertCanAddNewItems(userId);

  // Members, so the cart can show WHAT is in the bundle and checkout can
  // prorate GST across them.
  //
  // Every member is ONE unit per copy. `BundleItemDetail` has no quantity field
  // — its only per-member number is `drawCount` (prize-draw entries), and
  // treating that as a stock quantity would silently change how much a
  // prize-draw member decrements, which the stock fan-out has never done.
  const memberIds = bundle.bundleProductIds ?? [];
  const memberDocs = await Promise.all(
    memberIds.map((id) => productRepository.findById(id).catch(() => null)),
  );
  const groupMembers: CartLineMember[] = memberDocs
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      productId: p.id,
      quantity: 1,
      unitPrice: p.price,
      title: p.title,
      image: p.images?.[0] ?? p.mainImage,
      gstRate: p.gstRate,
      hsnCode: p.hsnCode,
      listingType: normalizeListingType(p),
    }));

  // `createdByStoreId` is optional on a bundle category and the tester fixture
  // has none, so this used to write `storeId: ""` — which produces an order
  // group keyed `standard:` with `storeId: undefined`: no seller notification,
  // no shipping resolution, no payout. Fall back to a member's store.
  const storeId =
    bundle.createdByStoreId ||
    memberDocs.find((p) => p?.storeId)?.storeId ||
    "";
  const storeName =
    bundle.createdByStoreName ||
    memberDocs.find((p) => p?.storeId === storeId)?.storeName ||
    "";

  await cartRepository.addItem(userId, {
    productId: bundle.id,
    productTitle: bundle.name,
    productImage: bundle.display?.coverImage ?? "",
    // The bundle's own locked price — NOT the sum of its members. That is the
    // whole point of a bundle, and `unitPriceFor` honours it.
    price: bundle.bundlePrice,
    currency: getDefaultCurrency(),
    quantity,
    storeId,
    storeName,
    listingType: "standard",
    lineKind: "bundle",
    groupId: bundle.id,
    groupSlug: bundle.slug,
    groupTitle: bundle.name,
    bundleCategorySlug: bundle.slug,
    ...(groupMembers.length > 0 && { groupMembers }),
    // `bundleProductIds` stays written ONLY when we could not resolve members
    // — it is the legacy read path (see CartItemDocument), and writing both
    // would be exactly the mirror-drift Root Cause #42 warns about.
    ...(groupMembers.length === 0 && { bundleProductIds: memberIds }),
  });
}
