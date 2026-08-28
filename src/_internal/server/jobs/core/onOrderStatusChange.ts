import { normalizeError } from "../../../../errors/normalize";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { decryptPii } from "../../../../security/index";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
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
  /** Buyer opted into the ₹10 WhatsApp order-updates addon at checkout. */
  whatsappNotifyAddon?: boolean;
};
export type OrderBefore = { status: OrderStatus };

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
