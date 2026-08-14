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

    await catalogueRepository.update(itemId, {
      listingStatus: "listed",
      linkedProductId: product.id,
      linkedProductSlug: product.slug ?? product.id,
    });

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

    await catalogueRepository.update(itemId, {
      listingStatus: "rejected",
      rejectionReason: reason,
    });
  });
}
