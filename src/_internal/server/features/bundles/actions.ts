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
import { getDefaultCurrency } from "../../../../core/baseline-resolver";

export async function addBundleToCartAction(
  userId: string,
  bundleSlug: string,
): Promise<void> {
  if (!userId) throw new ValidationError("User id is required");
  if (!bundleSlug) throw new ValidationError("Bundle slug is required");

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

  await cartRepository.addItem(userId, {
    productId: bundle.id,
    productTitle: bundle.name,
    productImage: bundle.display?.coverImage ?? "",
    price: bundle.bundlePrice,
    currency: getDefaultCurrency(),
    quantity: 1,
    storeId: bundle.createdByStoreId ?? "",
    storeName: bundle.createdByStoreName ?? "",
    listingType: "standard",
    bundleCategorySlug: bundle.slug,
    bundleProductIds: bundle.bundleProductIds ?? [],
  });
}
