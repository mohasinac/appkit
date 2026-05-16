import { storeRepository, userRepository } from "../../../../repositories";
import { decryptPii } from "../../../../security/index";
import {
  sendWhatsAppBusinessMessage,
  buildPurchaseAnnouncementMessage,
} from "../../../../features/whatsapp-bot/server";
import type { JobContext } from "../runtime/types";

interface OrderItem {
  title?: string;
  name?: string;
}

export interface NewOrder {
  buyerDisplayName?: string;
  buyerId?: string;
  items?: OrderItem[];
  totalAmount?: number;
  storeId?: string;
}

export interface HandleOrderCreateInput {
  orderId: string;
  order: NewOrder;
}

async function sendAnnouncement(
  ctx: JobContext,
  toPhone: string,
  message: string,
  phoneNumberId: string,
  accessToken: string,
  label: string,
  orderId: string,
): Promise<void> {
  try {
    const sent = await sendWhatsAppBusinessMessage({
      toPhone,
      message,
      phoneNumberId,
      accessToken,
    });
    if (sent) {
      ctx.logger.info(`Announcement sent to ${label}`, {
        orderId,
        toPhone: `...${toPhone.slice(-4)}`,
      });
    } else {
      ctx.logger.error(`Announcement delivery failed for ${label} (non-fatal)`, null, { orderId });
    }
  } catch (err) {
    ctx.logger.error(`Announcement send threw for ${label} (non-fatal)`, err, { orderId });
  }
}

async function notifyStoreOwner(
  ctx: JobContext,
  storeId: string,
  message: string,
  phoneNumberId: string,
  accessToken: string,
  orderId: string,
): Promise<void> {
  try {
    const store = await storeRepository.findBySlug(storeId);
    if (!store?.ownerId) return;
    const owner = await userRepository.findById(store.ownerId);
    const encryptedPhone = owner?.phoneNumber as string | undefined;
    if (!encryptedPhone) return;
    const ownerPhone = decryptPii(encryptedPhone) as string | null;
    if (ownerPhone) {
      await sendAnnouncement(ctx, ownerPhone, message, phoneNumberId, accessToken, "store-owner", orderId);
    }
  } catch (err) {
    ctx.logger.error("Store owner lookup failed (non-fatal)", err, { orderId, storeId });
  }
}

export async function handleOrderCreate(
  input: HandleOrderCreateInput,
  ctx: JobContext,
): Promise<void> {
  const { orderId, order } = input;
  const phoneNumberId = ctx.env("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  const accessToken = ctx.env("WHATSAPP_CLOUD_API_TOKEN") ?? "";

  if (!phoneNumberId || !accessToken) {
    ctx.logger.info("WhatsApp Cloud API not configured — skipping announcement", { orderId });
    return;
  }

  const items = order.items ?? [];
  const firstItem = items[0];
  const firstItemName = firstItem?.title ?? firstItem?.name ?? "an item";
  const additionalItemCount = Math.max(0, items.length - 1);
  const buyerName = order.buyerDisplayName ?? "A customer";

  const message = buildPurchaseAnnouncementMessage({
    buyerName,
    firstItemName,
    additionalItemCount,
    totalAmount: order.totalAmount ?? 0,
    orderId,
  });

  const adminNumbersRaw = ctx.env("WHATSAPP_ADMIN_NOTIFY_NUMBERS") ?? "";
  const adminNumbers = adminNumbersRaw
    .split(",")
    .map((n) => n.trim().replace(/\D/g, ""))
    .filter(Boolean);

  for (const num of adminNumbers) {
    await sendAnnouncement(ctx, num, message, phoneNumberId, accessToken, "admin", orderId);
  }

  const storeId = order.storeId;
  if (storeId) {
    await notifyStoreOwner(ctx, storeId, message, phoneNumberId, accessToken, orderId);
  }

  ctx.logger.info(`Order announcement complete`, {
    orderId,
    adminCount: adminNumbers.length,
    storeId: storeId ?? "unknown",
  });
}
