import { normalizeError } from "../../../../errors/normalize";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { decryptPii } from "../../../../security/index";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
/* Phase 7 — numbering only; the PDF renderer lives in `functions/` because
 * `pdfkit` must not enter appkit's module graph. */
import { allocateSeriesNumber } from "../../features/invoicing/allocate";
import type { JobContext } from "../runtime/types";
import { ORDER_MESSAGES } from "../handlers/messages";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

type NotificationType =
  | "order_placed"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled";

interface StatusConfig {
  type: NotificationType;
  title: string;
  message: (order: { productTitle: string; trackingNumber?: string }) => string;
  priority: "low" | "normal" | "high";
}

const STATUS_CONFIG: Partial<Record<OrderStatus, StatusConfig>> = {
  confirmed: {
    type: "order_confirmed",
    title: ORDER_MESSAGES.CONFIRMED_TITLE,
    message: (o) => ORDER_MESSAGES.CONFIRMED_MESSAGE(o.productTitle),
    priority: "normal",
  },
  shipped: {
    type: "order_shipped",
    title: ORDER_MESSAGES.SHIPPED_TITLE,
    message: (o) => ORDER_MESSAGES.SHIPPED_MESSAGE(o.productTitle, o.trackingNumber),
    priority: "high",
  },
  delivered: {
    type: "order_delivered",
    title: ORDER_MESSAGES.DELIVERED_TITLE,
    message: (o) => ORDER_MESSAGES.DELIVERED_MESSAGE(o.productTitle),
    priority: "normal",
  },
  cancelled: {
    type: "order_cancelled",
    title: ORDER_MESSAGES.CANCELLED_TITLE,
    message: (o) => `Your order for "${o.productTitle}" has been cancelled.`,
    priority: "normal",
  },
};

export type OrderAfter = {
  status: OrderStatus;
  userId: string;
  userEmail: string;
  productTitle: string;
  trackingNumber?: string;
  /**
   * Phase 7 — the invoice is numbered on the PAYMENT transition, which is a
   * different axis from `status` and is why these two fields are here.
   */
  paymentStatus?: string;
  invoiceNumber?: string;
  /** Buyer opted into the ₹10 WhatsApp order-updates addon at checkout. */
  whatsappNotifyAddon?: boolean;
};
export type OrderBefore = { status: OrderStatus; paymentStatus?: string };

export interface HandleOrderStatusChangeInput {
  orderId: string;
  before: OrderBefore | null;
  after: OrderAfter | null;
}

export async function handleOrderStatusChange(
  input: HandleOrderStatusChangeInput,
  ctx: JobContext,
): Promise<void> {
  const { orderId, before, after } = input;
  if (!before || !after) return;

  /*
   * ── PHASE 7: number the invoice on the PAYMENT transition ─────────────────
   *
   * 🛑 PLACED FIRST, before the `status`-unchanged early return. That return
   * is correct for the notification work below it, and it is also why this
   * cannot go after it: `paymentStatus: pending → paid` frequently happens
   * with NO change to `status` at all (a COD order verified by an admin, a
   * manual proof approved), so appending this below would have numbered only
   * the minority of paid orders whose status happened to move in the same
   * write. That is Root Cause #27's sweep-coverage trap, and R1 in
   * `paymentWindowTimeout` had to be placed the same way for the same reason.
   *
   * 🛑 Extending THIS trigger rather than adding a second one on `orders`.
   * A second Firestore trigger on the same collection wakes for every write
   * and returns — which is how `onShipmentDeleted` burned a million
   * invocations a day sitting correctly-guarded beside a neighbour's loop
   * (Root Cause #92). The sticker-trace definitions carry the same 🛑.
   *
   * 🛑 And it is numbering ONLY — no PDF. `pdfkit` is a Functions dependency
   * and must not enter appkit's module graph; the bytes are rendered once,
   * lazily, by the serve route and stored from there. Numbering is the half
   * that must be immediate and transactional, because it is the half that
   * cannot be corrected: a number cannot be withdrawn without leaving a gap.
   */
  const becamePaid = before.paymentStatus !== "paid" && after.paymentStatus === "paid";
  if (becamePaid && !after.invoiceNumber) {
    try {
      const allocation = await allocateSeriesNumber({
        kind: "invoice",
        subjectId: orderId,
        orderId,
      });
      /*
       * Only writes when THIS call allocated. A re-entry that found an
       * existing claim skips the write entirely, which keeps a re-fired
       * trigger from touching the order at all — the write that would
       * otherwise re-fire this very trigger.
       */
      if (allocation.allocated) {
        await orderRepository.update(orderId, {
          invoiceNumber: allocation.number,
          invoiceIssuedAt: new Date(),
        });
        ctx.logger.info(`Invoice ${allocation.number} allocated`, { orderId });
      }
    } catch (error) {
      /*
       * Logged and swallowed, so a numbering failure cannot suppress the
       * buyer's order notification below. The order stays un-invoiced, which
       * is a visible, retryable state — the next write that touches
       * `paymentStatus` re-attempts, and the serve route can allocate on
       * demand. Throwing here would also make the Firestore trigger retry the
       * whole handler, re-sending the notification.
       */
      ctx.logger.error("Invoice allocation failed", normalizeError(error), {
        orderId,
      });
    }
  }

  if (before.status === after.status) return;

  const newStatus = after.status;
  const config = STATUS_CONFIG[newStatus];

  if (!config) {
    ctx.logger.info(`No handler for status transition → ${newStatus}`, { orderId });
    return;
  }

  const userEmail = decryptPii(after.userEmail) as string;

  try {
    const messageText = config.message({
      productTitle: after.productTitle,
      trackingNumber: after.trackingNumber,
    });

    await sendNotification({
      userId: after.userId,
      type: config.type,
      priority: config.priority,
      title: config.title,
      message: messageText,
      relatedId: orderId,
      relatedType: "order",
      userEmail,
      orderWhatsappAddonPaid: after.whatsappNotifyAddon === true,
    });

    // The RTDB mirror that used to live here has been removed. `sendNotification`
    // above is the real path (in-app + email + WhatsApp); the extra
    // `notifications/{uid}` push was a duplicate that NOTHING read — no client
    // subscription to that node has ever existed — and nothing pruned, so it
    // accumulated one node per order transition per user forever. Its rule's
    // `.type` validator also only allowed `info|success|warning|error`, none of
    // which are the values written here (`order_confirmed`, `order_shipped`, …).

    ctx.logger.info(`Order ${orderId} status → ${newStatus}`, { userId: after.userId });
  } catch (error) {
    ctx.logger.error("Error handling order status change", error, { orderId });
    throw error;
  }
}
