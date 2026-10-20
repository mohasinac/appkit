import { normalizeError } from "../../../../errors/normalize";
import { ORDER_PII_FIELDS, revealPii } from "../../../../security";
import { adminNotificationsRepository } from "../../../../repositories";
import { buildPurchaseAnnouncementMessage } from "../../../../features/orders/utils/order-announcement-message";
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
   * The seller is told about their own sale by the `order_placed`
   * notification `createOrderForGroup` already sends (in-app + email). This
   * handler used to ALSO push a WhatsApp Cloud API message here — a duplicate
   * channel for the same event, and the only thing in this file that needed a
   * Meta token, a registered number and a billing relationship. Removed with
   * the rest of the WhatsApp integration on 2026-10-20; no signal was lost,
   * because the notification path is independent and unchanged.
   */
  ctx.logger.info("Order announcement complete", { orderId, storeId: order.storeId ?? null });
}
