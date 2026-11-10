import { normalizeError } from "../../../../errors/normalize";
import { ORDER_PII_FIELDS, revealPii } from "../../../../security";
import { adminNotificationsRepository } from "../../../../features/store-extensions/repository/rbac.repositories";
import { buildPurchaseAnnouncementMessage } from "../../../../features/whatsapp-bot/server";
import type { JobContext } from "../runtime/types";
import type { OrderDocument, OrderDocumentItem } from "../../../../features/orders/schemas/firestore";

// Mirrors the real OrderDocument field names — the trigger receives the raw
// Firestore snapshot, so this must match, not a hand-picked convenience shape.
export type NewOrder = Pick<OrderDocument, "userName" | "userId" | "totalPrice" | "storeId"> & {
  items?: Pick<OrderDocumentItem, "productTitle">[];
};

export interface HandleOrderCreateInput {
  orderId: string;
  order: NewOrder;
}

/*
 * 🛑 FOUR FUNCTIONS WERE DELETED HERE 2026-11-11, not merely unused.
 *
 * `sendAnnouncement`, `notifyStoreOwner`, `usable` and
 * `resolveWhatsAppCredentials` existed solely to send the seller a FREE-FORM
 * WhatsApp message about a new order. That send is now made by
 * `dispatchNotification` from checkout, through the approved
 * `tx_seller_order_update` template -- which, unlike free-form text, is not
 * refused outside Meta's 24-hour customer-service window, and which also
 * gives the seller an in-app row and an email.
 *
 * ⚠ Left behind, the chain would have been ~95 lines of credential resolution
 * and PII decryption with no caller -- the kind of dead code that reads as the
 * live path to the next person looking for where sellers get notified.
 *
 * ⚠ The useful knowledge in `resolveWhatsAppCredentials` is not lost: the
 * `WHATSAPP_MESSAGES_TOKEN`-before-`WHATSAPP_CLOUD_API_TOKEN` ordering and the
 * `*_PLACEHOLDER` guard both live in `core/integration-keys.ts`, which this
 * copy already deferred to for its DB half.
 */


export async function handleOrderCreate(
  input: HandleOrderCreateInput,
  ctx: JobContext,
): Promise<void> {
  const { orderId, order } = input;

  const items = order.items ?? [];
  const firstItem = items[0];
  const firstItemName = firstItem?.productTitle ?? "an item";
  const additionalItemCount = Math.max(0, items.length - 1);
  /*
   * 🛑 DECRYPT. This handler receives the RAW Firestore snapshot — the type
   * above says so — so it never passes through the repository's `mapDoc`, and
   * `userName` is PII, stored as `enc:v1:…`.
   *
   * Undecrypted, the ciphertext was interpolated straight into the announcement
   * body and PERSISTED there, so every admin alert read
   * "🛍️ New order! enc:v1:67Mn0rITjTWGsZZE:… purchased …". Measured on
   * production: 383 such rows. The message is baked at write time, so the
   * damage is permanent per row — decrypting on read would not repair them.
   *
   * `decryptPii` was already imported in this file and used for the store
   * owner's phone eleven lines up; the buyer's name was simply missed.
   */
  /*
   * The NAMED accessor, not a bare `decryptPii` cast.
   *
   * This already decrypted and therefore already WORKED — but through a cast
   * that defeated the brand, so "is every reader converted?" could not be
   * answered by grepping for `reveal*`. Routing it through `revealOrder` makes
   * the decision visible in review and in a grep, which is the whole argument
   * for named accessors over an inline decrypt.
   */
  const buyerName =
    revealPii<{ userName?: string }>(order, ORDER_PII_FIELDS).userName ??
    "A customer";

  const message = buildPurchaseAnnouncementMessage({
    buyerName,
    firstItemName,
    additionalItemCount,
    totalAmount: order.totalPrice ?? 0,
    orderId,
  });

  /*
   * Staff side: one durable row, not a WhatsApp message per admin number.
   *
   * 🛑 This used to loop `whatsappAdminNotifyNumbers` and send the purchase
   * announcement to every one of them, ON EVERY ORDER — the highest-volume
   * staff blast in the codebase. It is now an `adminNotifications` row that
   * the admin inbox reads and the daily digest counts.
   *
   * Written BEFORE the credential check on purpose. The old code returned
   * early when WhatsApp was unconfigured, which meant that with no Meta
   * credentials — the state this project is actually in — an order produced
   * no staff signal at all, and no record that it hadn't.
   */
  try {
    await adminNotificationsRepository.create({
      category: "growth",
      title: "New order placed",
      body: message,
      severity: "info",
      isRead: false,
      entityType: "order",
      entityId: orderId,
      audienceUserIds: [],
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to write admin order notification (non-fatal)", err, { orderId });
  }

  /*
   * ── THE SELLER'S OWN NOTIFICATION IS NO LONGER SENT FROM HERE ─────────────
   *
   * 🛑 RETIRED 2026-11-11, and the reason is that it had become a DUPLICATE.
   *
   * This path sent the seller a FREE-FORM WhatsApp message via
   * `sendWhatsAppBusinessMessage`. Two things were wrong with it:
   *
   * 1. ⚠ It mostly never arrived. Meta rejects free-form business-initiated
   *    sends outside the 24-hour customer-service window, so a seller who had
   *    not messaged us in the last day — the normal case — got nothing, and
   *    the failure looked like an outage rather than a policy rejection.
   *
   * 2. 🛑 It was the seller's ONLY signal, so it carried no in-app row, no
   *    email and no notification type. A seller whose window had closed
   *    learned about a sale from nothing at all.
   *
   * Both are now handled properly one layer up: checkout's
   * `emitOrderPlacedNotifications` calls `dispatchNotification`, which reaches
   * the seller through the registry with an in-app row, an email, and the
   * approved `tx_seller_order_update` template on WhatsApp — a template send
   * is exempt from the 24-hour window, which is the entire point of having
   * one. Its CTA is `/store/orders/{id}/view`, not the buyer's track page.
   *
   * ⚠ This block's own deferral note said switching it on here first would
   * give an opted-in seller TWO messages for one order. That was correct, and
   * it is why the duplicate is being DELETED rather than converted: the
   * surviving path is the one that reaches every channel.
   *
   * 🛑 What is deliberately KEPT above: the `adminNotifications` row. That is
   * the STAFF signal, a different audience with a different purpose, and it is
   * written before any credential check precisely so an unconfigured WhatsApp
   * cannot erase the record that an order happened.
   */
  ctx.logger.info("Order announcement complete (staff row written)", {
    orderId,
    storeId: order.storeId ?? null,
  });
}
