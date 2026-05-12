import { notificationRepository } from "../../../../repositories";
import { decryptPii } from "../../../../security/index";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import type { FirestoreTriggerHandler } from "../runtime/types";
import { ORDER_MESSAGES, EMAIL_SUBJECTS, JOB_ERROR_MESSAGES } from "./messages";

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
  sendEmail: boolean;
}

const STATUS_CONFIG: Partial<Record<OrderStatus, StatusConfig>> = {
  confirmed: {
    type: "order_confirmed",
    title: ORDER_MESSAGES.CONFIRMED_TITLE,
    message: (o) => ORDER_MESSAGES.CONFIRMED_MESSAGE(o.productTitle),
    priority: "normal",
    sendEmail: true,
  },
  shipped: {
    type: "order_shipped",
    title: ORDER_MESSAGES.SHIPPED_TITLE,
    message: (o) => ORDER_MESSAGES.SHIPPED_MESSAGE(o.productTitle, o.trackingNumber),
    priority: "high",
    sendEmail: true,
  },
  delivered: {
    type: "order_delivered",
    title: ORDER_MESSAGES.DELIVERED_TITLE,
    message: (o) => ORDER_MESSAGES.DELIVERED_MESSAGE(o.productTitle),
    priority: "normal",
    sendEmail: true,
  },
  cancelled: {
    type: "order_cancelled",
    title: ORDER_MESSAGES.CANCELLED_TITLE,
    message: (o) => `Your order for "${o.productTitle}" has been cancelled.`,
    priority: "normal",
    sendEmail: false,
  },
};

async function sendResendEmail(params: {
  to: string;
  status: OrderStatus;
  orderId: string;
  productTitle: string;
  trackingNumber?: string;
  apiKey: string;
  fromAddress: string;
  brandName: string;
}): Promise<void> {
  const subject =
    params.status === "confirmed"
      ? EMAIL_SUBJECTS.ORDER_CONFIRMED(params.productTitle)
      : params.status === "shipped"
        ? EMAIL_SUBJECTS.ORDER_SHIPPED(params.productTitle)
        : params.status === "delivered"
          ? EMAIL_SUBJECTS.ORDER_DELIVERED(params.productTitle)
          : EMAIL_SUBJECTS.ORDER_UPDATE_FALLBACK(params.productTitle);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.fromAddress,
      to: [params.to],
      subject,
      html: `<p>Hi,</p><p>Your order for <strong>${params.productTitle}</strong> is now <strong>${params.status}</strong>.</p>${
        params.trackingNumber ? `<p>Tracking number: ${params.trackingNumber}</p>` : ""
      }<p>Thanks,<br/>${params.brandName} Team</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(JOB_ERROR_MESSAGES.RESEND_API_ERROR(response.status, body));
  }
}

type OrderAfter = {
  status: OrderStatus;
  userId: string;
  userEmail: string;
  productTitle: string;
  trackingNumber?: string;
};
type OrderBefore = { status: OrderStatus };

export const onOrderStatusChangeHandler: FirestoreTriggerHandler<OrderBefore, OrderAfter> = async (
  event,
  ctx,
) => {
  const { before, after } = event;
  if (!before || !after) return;
  if (before.status === after.status) return;

  const orderId = event.params.orderId;
  const newStatus = after.status;
  const config = STATUS_CONFIG[newStatus];

  if (!config) {
    ctx.logger.info(`No handler for status transition → ${newStatus}`, { orderId });
    return;
  }

  // Decrypt PII that was encrypted at rest
  const userEmail = decryptPii(after.userEmail) as string;

  try {
    const messageText = config.message({
      productTitle: after.productTitle,
      trackingNumber: after.trackingNumber,
    });

    await notificationRepository.create({
      userId: after.userId,
      type: config.type,
      priority: config.priority,
      title: config.title,
      message: messageText,
      relatedId: orderId,
      relatedType: "order",
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

    if (config.sendEmail) {
      const apiKey = ctx.env("RESEND_API_KEY") ?? "";
      if (!apiKey) {
        ctx.logger.error(JOB_ERROR_MESSAGES.RESEND_KEY_MISSING, null);
      } else {
        try {
          const fromAddress =
            ctx.env("ORDER_EMAIL_FROM") ?? ctx.env("RESEND_FROM_ADDRESS") ?? "";
          const brandName = ctx.env("APPKIT_BRAND_NAME") ?? "";
          if (!fromAddress || !brandName) {
            ctx.logger.error(
              "ORDER_EMAIL_FROM / APPKIT_BRAND_NAME not configured — skipping order status email",
              null,
              { orderId },
            );
          } else {
            await sendResendEmail({
              to: userEmail,
              status: newStatus,
              orderId,
              productTitle: after.productTitle,
              trackingNumber: after.trackingNumber,
              apiKey,
              fromAddress,
              brandName,
            });
          }
        } catch (emailError) {
          ctx.logger.error("Email send failed (non-fatal)", emailError, { orderId });
        }
      }
    }

    ctx.logger.info(`Order ${orderId} status → ${newStatus}`, {
      userId: after.userId,
      emailSent: config.sendEmail,
    });
  } catch (error) {
    ctx.logger.error("Error handling order status change", error, { orderId });
    throw error;
  }
};
