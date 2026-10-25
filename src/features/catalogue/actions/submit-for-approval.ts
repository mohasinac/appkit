"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../_internal/shared/types/action-result";
import { catalogueRepository } from "../repository/catalogue.repository";
import { requireRoleUser } from "../../../providers/auth-firebase/helpers";
import { ValidationError, AuthorizationError } from "../../../errors";
import { assertCatalogueImagesFresh } from "../utils/freshness";

/**
 * Buyer path — requests admin list the item on their behalf. Flips
 * listingStatus to "pending_admin_approval"; the admin-notification fan-out
 * happens in the onCatalogueSubmittedForApproval Firestore trigger, keeping
 * this action fast (Rule #6) regardless of how many admins exist.
 */
export async function submitCatalogueItemForApprovalAction(itemId: string): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "seller", "admin"]);
    const item = await catalogueRepository.findById(itemId);
    if (!item) throw new ValidationError("Catalogue item not found");
    if (item.ownerId !== user.uid) throw new AuthorizationError("You do not own this catalogue item");
    if (item.listingStatus !== "not_listed") {
      throw new ValidationError("Only items not yet submitted can be requested for listing");
    }

    assertCatalogueImagesFresh(item);

    await catalogueRepository.setListingStatus(
      itemId,
      { listingStatus: "pending_admin_approval", submittedForApprovalAt: new Date() },
      { actor: { role: "buyer", uid: user.uid }, trigger: "submitCatalogueForApproval" },
      item,
    );
  });
}
