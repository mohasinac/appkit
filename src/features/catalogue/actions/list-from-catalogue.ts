"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { catalogueRepository, storeRepository } from "../../../repositories";
import { requireRoleUser } from "../../../providers/auth-firebase/helpers";
import { isAdminUser } from "../../../features/auth/role-predicates";
import { ValidationError, AuthorizationError } from "../../../errors";
import { assertCatalogueImagesFresh } from "../utils/freshness";
import { createProductFromCatalogueItem, CONSIGNMENT_STORE_ID } from "../utils/product-from-item";

/**
 * Direct-listing path — turns a catalogue item straight into a real listing,
 * no approval queue. Two callers:
 *   - **Seller**: listed under their own store.
 *   - **Admin**: admins are buyers too and have no personal seller store of
 *     their own, so their catalogue lists under the platform's consignment
 *     store (`store-letitrip-official`) — the same store the buyer-approval
 *     path uses. An admin approving their own "Request to sell" would be a
 *     pointless round trip, so admins get the direct path instead.
 * Freshness-gated (req: photos must be < 30 days old) — see
 * `assertCatalogueImagesFresh`.
 */
export async function listFromCatalogueAction(itemId: string): Promise<ActionResult<{ productId: string; productSlug: string }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
    const item = await catalogueRepository.findById(itemId);
    if (!item) throw new ValidationError("Catalogue item not found");
    if (item.ownerId !== user.uid) throw new AuthorizationError("You do not own this catalogue item");
    if (item.listingStatus === "listed") throw new ValidationError("This item is already listed");

    assertCatalogueImagesFresh(item);

    let storeId: string;
    if (isAdminUser(user)) {
      storeId = CONSIGNMENT_STORE_ID;
    } else {
      const store = await storeRepository.findByOwnerId(user.uid);
      if (!store) throw new ValidationError("You need a store before listing from your catalogue");
      storeId = store.id;
    }

    const product = await createProductFromCatalogueItem(item, storeId);

    await catalogueRepository.update(itemId, {
      listingStatus: "listed",
      linkedProductId: product.id,
      linkedProductSlug: product.slug ?? product.id,
    });

    return { productId: product.id, productSlug: product.slug ?? product.id };
  });
}
