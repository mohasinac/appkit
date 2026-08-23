import { normalizeError } from "../../../../errors/normalize";
import { storeRepository, userRepository } from "../../../../repositories";
import { decryptPii } from "../../../../security/index";
import {
  sendWhatsAppBusinessMessage,
  buildPurchaseAnnouncementMessage,
} from "../../../../features/whatsapp-bot/server";
import { resolveKeys, type ResolvedKeys } from "../../../../core/integration-keys";
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
    void normalizeError(err);
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
    void normalizeError(err);
    ctx.logger.error("Store owner lookup failed (non-fatal)", err, { orderId, storeId });
  }
}

/**
 * Seeded credentials are `*_PLACEHOLDER` strings rather than empty, so an
 * emptiness test alone would happily send with a fake token. Mirrors the guard
 * in checkout-value-otp-actions.ts.
 */
function usable(value: string | undefined): string {
  const v = value?.trim() ?? "";
  return v && !v.includes("PLACEHOLDER") ? v : "";
}

async function resolveWhatsAppCredentials(
  ctx: JobContext,
  orderId: string,
): Promise<{ phoneNumberId: string; accessToken: string; adminNumbersRaw: string }> {
  let db: Partial<ResolvedKeys> = {};
  try {
    db = await resolveKeys();
  } catch (err) {
    void normalizeError(err);
    // Firestore unreachable from the Functions runtime — env-only is still a
    // valid configuration, so this is a warning, not a failure.
    ctx.logger.warn("Credential lookup failed — falling back to env", { orderId });
  }

  return {
    phoneNumberId:
      usable(db.whatsappPhoneNumberId) || usable(ctx.env("WHATSAPP_PHONE_NUMBER_ID")),
    accessToken:
      usable(db.whatsappCloudApiToken) || usable(ctx.env("WHATSAPP_CLOUD_API_TOKEN")),
    adminNumbersRaw:
      usable(db.whatsappAdminNotifyNumbers) || usable(ctx.env("WHATSAPP_ADMIN_NOTIFY_NUMBERS")),
  };
}

export async function handleOrderCreate(
  input: HandleOrderCreateInput,
  ctx: JobContext,
): Promise<void> {
  const { orderId, order } = input;

  // Credentials resolve DB-first (Admin → Site Settings → WhatsApp) with an env
  // fallback, matching resolveKeys() and every other WhatsApp send path. This
  // read ctx.env() ONLY until 2026-08-22, so credentials saved in Site Settings
  // never reached the order-placed announcement — it silently no-op'd unless the
  // Functions runtime also carried the env vars.
  const { phoneNumberId, accessToken, adminNumbersRaw } = await resolveWhatsAppCredentials(ctx, orderId);

  if (!phoneNumberId || !accessToken) {
    ctx.logger.info("WhatsApp Cloud API not configured — skipping announcement", { orderId });
    return;
  }

  const items = order.items ?? [];
  const firstItem = items[0];
  const firstItemName = firstItem?.productTitle ?? "an item";
  const additionalItemCount = Math.max(0, items.length - 1);
  const buyerName = order.userName ?? "A customer";

  const message = buildPurchaseAnnouncementMessage({
    buyerName,
    firstItemName,
    additionalItemCount,
    totalAmount: order.totalPrice ?? 0,
    orderId,
  });

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
