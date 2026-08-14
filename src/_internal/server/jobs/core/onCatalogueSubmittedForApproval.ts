import { userRepository } from "../../../../features/auth/repository/user.repository";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import type { CatalogueItemDocument } from "../../../../features/catalogue/schemas/firestore";

export interface CatalogueApprovalEvent {
  itemId: string;
  before: CatalogueItemDocument;
  after: CatalogueItemDocument;
}

/**
 * Fires when a catalogue item's `listingStatus` transitions to
 * "pending_admin_approval" (a buyer's "Request to sell"). Notifies every
 * admin so the approvals queue doesn't go unnoticed. Kept out of the
 * synchronous submit action per Rule #6 — the buyer-facing request stays
 * fast regardless of how many admins there are to fan out to.
 */
export async function handleCatalogueSubmittedForApproval(
  event: CatalogueApprovalEvent,
  ctx: JobContext,
): Promise<void> {
  const becamePending =
    event.before.listingStatus !== "pending_admin_approval" &&
    event.after.listingStatus === "pending_admin_approval";
  if (!becamePending) return;

  const admins = await userRepository.findByRole("admin");
  for (const admin of admins) {
    try {
      await sendNotification({
        userId: admin.uid,
        type: "system",
        priority: "normal",
        title: "New catalogue listing request",
        message: `"${event.after.title}" was submitted for approval to list under LetItRip Official.`,
        actionUrl: "/admin/catalogue-approvals",
        actionLabel: "Review request",
        relatedId: event.itemId,
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("onCatalogueSubmittedForApproval: failed to notify admin", {
        itemId: event.itemId,
        adminUid: admin.uid,
      });
    }
  }
}
