"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { catalogueRepository } from "../../../repositories";
import { requireRoleUser } from "../../../providers/auth-firebase/helpers";
import { isAdminUser } from "../../../features/auth/role-predicates";
import { ValidationError, AuthorizationError } from "../../../errors";
import { createProductFromCatalogueItem, CONSIGNMENT_STORE_ID } from "../utils/product-from-item";

/**
 * Admin path — approves a buyer's "Request to sell", creating the product
 * under the platform's own consignment store (not the buyer's, since a
 * buyer has none) and preserving `sourceCatalogueOwnerId` for future
 * consignment/payout traceability.
 */
export async function approveCatalogueListingAction(
  itemId: string,
): Promise<ActionResult<{ productId: string; productSlug: string }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin"]);
    if (!isAdminUser(user)) throw new AuthorizationError("Only admin can approve catalogue listings");

    const item = await catalogueRepository.findById(itemId);
    if (!item) throw new ValidationError("Catalogue item not found");
    if (item.listingStatus !== "pending_admin_approval") {
      throw new ValidationError("Only items pending approval can be approved");
    }

    const product = await createProductFromCatalogueItem(item, CONSIGNMENT_STORE_ID);

    // `item` came from the findById above, so the timeline entry is free.
    await catalogueRepository.setListingStatus(
      itemId,
      {
        listingStatus: "listed",
        linkedProductId: product.id,
        linkedProductSlug: product.slug ?? product.id,
      },
      { actor: { role: "admin", uid: user.uid }, trigger: "approveCatalogueListing" },
      item,
    );

    return { productId: product.id, productSlug: product.slug ?? product.id };
  });
}

export async function rejectCatalogueListingAction(itemId: string, reason: string): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin"]);
    if (!isAdminUser(user)) throw new AuthorizationError("Only admin can reject catalogue listings");

    const item = await catalogueRepository.findById(itemId);
    if (!item) throw new ValidationError("Catalogue item not found");
    if (item.listingStatus !== "pending_admin_approval") {
      throw new ValidationError("Only items pending approval can be rejected");
    }

    await catalogueRepository.setListingStatus(
      itemId,
      { listingStatus: "rejected", rejectionReason: reason },
      // The reason is the point of the entry — `rejectionReason` on the
      // document is overwritten by the next decision.
      { actor: { role: "admin", uid: user.uid }, trigger: "rejectCatalogueListing", reason },
      item,
    );
  });
}
