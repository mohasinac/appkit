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
    });

    try {
      await getAdminRealtimeDb().ref(`notifications/${after.userId}`).push({
        type: config.type,
        title: config.title,
        message: messageText,
        timestamp: Date.now(),
        read: false,
      });
    } catch (rtdbError) {
      ctx.logger.error("Realtime DB push failed (non-fatal)", rtdbError);
    }

    ctx.logger.info(`Order ${orderId} status → ${newStatus}`, { userId: after.userId });
  } catch (error) {
    ctx.logger.error("Error handling order status change", error, { orderId });
    throw error;
  }
}
