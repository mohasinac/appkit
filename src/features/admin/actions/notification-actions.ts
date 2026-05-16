import { notificationRepository } from "../repository/notification.repository";
import { siteSettingsRepository } from "../repository/site-settings.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { createResendProvider } from "../../../providers/email-resend/provider";
import { sendWhatsAppBusinessMessage } from "../../whatsapp-bot/helpers/whatsapp";
import { serverLogger } from "../../../monitoring";
import { decryptPii } from "../../../security/index";
import type { NotificationDocument, NotificationCreateInput } from "../schemas";
import type { NotificationTypePrefs } from "../../account/types";
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  meetsMinPriority,
} from "../schemas/firestore";

export async function markNotificationRead(id: string): Promise<void> {
  await notificationRepository.markAsRead(id);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  return notificationRepository.markAllAsRead(userId);
}

export async function deleteNotification(id: string): Promise<void> {
  await notificationRepository.delete(id);
}

export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<{ notifications: NotificationDocument[]; unreadCount: number }> {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findByUser(userId, limit),
    notificationRepository.getUnreadCount(userId),
  ]);
  return { notifications, unreadCount };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return notificationRepository.getUnreadCount(userId);
}

// ---------------------------------------------------------------------------
// Multi-channel notification dispatcher
// ---------------------------------------------------------------------------

export interface SendNotificationInput extends NotificationCreateInput {
  /** User's email — used by the email channel when enabled. */
  userEmail?: string;
  /** User's phone with country code, digits only — used by WhatsApp channel. */
  userPhone?: string;
  /** Pre-rendered email HTML — falls back to a plain-text <p> when absent. */
  emailHtml?: string;
}

export interface SendNotificationResult {
  notification: NotificationDocument;
  email: "sent" | "skipped" | "failed";
  whatsapp: "sent" | "skipped" | "failed";
}

/**
 * Create an in-app notification and fan out to enabled external channels.
 *
 * In-app is always written.  Email / WhatsApp are sent only when:
 *   1. The channel is enabled in siteSettings.notificationChannels
 *   2. Notification priority meets the channel's minPriority threshold
 *   3. The optional `types` filter includes this notification type (or is absent)
 *   4. The contact field (userEmail / userPhone) is supplied by the caller
 *   5. The required credentials are set in siteSettings.credentials
 */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const { userEmail, userPhone, emailHtml, ...notifInput } = input;

  // Always write the in-app notification first.
  const notification = await notificationRepository.create(notifInput);

  // Load channel config + credentials (one Firestore read).
  let settings: Awaited<ReturnType<typeof siteSettingsRepository.getSingleton>>;
  try {
    settings = await siteSettingsRepository.getSingleton();
  } catch (err) {
    serverLogger.warn("sendNotification: could not load siteSettings — skipping external channels", { err });
    return { notification, email: "skipped", whatsapp: "skipped" };
  }

  const channels = settings.notificationChannels ?? DEFAULT_NOTIFICATION_CHANNELS;
  const creds = settings.credentials ?? {};
  const { type, priority, title, message } = notifInput;

  // Load user notification preferences (best-effort — if missing, all channels allowed).
  let userChannelPrefs: { email?: boolean; whatsapp?: boolean; sms?: boolean } = {};
  let userTypePrefs: NotificationTypePrefs = {};
  let fetchedUserDoc: Awaited<ReturnType<typeof userRepository.findById>> | undefined;
  try {
    fetchedUserDoc = await userRepository.findById(input.userId);
    userChannelPrefs = fetchedUserDoc?.notificationPreferences?.channels ?? {};
    userTypePrefs = fetchedUserDoc?.notificationPreferences?.types ?? {};
  } catch {
    // non-fatal: fall through with empty prefs (all enabled)
  }

  // If caller didn't supply userEmail, try to decrypt it from the already-fetched user doc.
  const resolvedEmail =
    userEmail ??
    (fetchedUserDoc?.email ? (decryptPii(fetchedUserDoc.email) as string | undefined) : undefined);
  const resolvedPhone =
    userPhone ??
    (fetchedUserDoc?.phoneNumber ? (decryptPii(fetchedUserDoc.phoneNumber) as string | undefined) : undefined);

  // Map NotificationType to a NotificationTypePrefs key.
  const typeToPrefsKey: Partial<Record<string, keyof NotificationTypePrefs>> = {
    order_placed: "orderUpdates", order_confirmed: "orderUpdates",
    order_shipped: "orderUpdates", order_delivered: "orderUpdates",
    order_cancelled: "orderUpdates",
    bid_placed: "bids", bid_outbid: "bids", bid_won: "bids", bid_lost: "bids",
    review_approved: "reviews", review_replied: "reviews",
    promotion: "promotions",
    system: "system", welcome: "system", account_action: "system",
    offer_received: "offers", offer_responded: "offers",
    offer_expired: "offers", offer_counter_accepted: "offers",
    refund_initiated: "orderUpdates",
    product_available: "system",
    prize_reveal_ready: "orderUpdates",
    prize_reveal_expired: "orderUpdates",
    prize_reveal_reminder: "orderUpdates",
  };
  const typeKey = typeToPrefsKey[type];
  // If the user has explicitly disabled this notification type, skip all external channels.
  if (typeKey && userTypePrefs[typeKey] === false) {
    return { notification, email: "skipped", whatsapp: "skipped" };
  }

  // Email channel — admin enabled AND user hasn't opted out
  let emailStatus: SendNotificationResult["email"] = "skipped";
  if (
    channels.email.enabled &&
    userChannelPrefs.email !== false &&
    resolvedEmail &&
    meetsMinPriority(priority, channels.email.minPriority) &&
    (!channels.email.types?.length || channels.email.types.includes(type))
  ) {
    const apiKey = creds.resendApiKey?.trim() ?? "";
    const fromEmail = settings.emailSettings?.fromEmail ?? "noreply@letitrip.in";
    const fromName = settings.emailSettings?.fromName ?? "LetItRip";
    if (apiKey && !apiKey.includes("PLACEHOLDER")) {
      try {
        const emailProvider = createResendProvider({ apiKey, fromEmail, fromName });
        await emailProvider.send({
          to: resolvedEmail,
          subject: title,
          html: emailHtml ?? `<p>${message}</p>`,
          text: message,
        });
        emailStatus = "sent";
      } catch (err) {
        serverLogger.error("sendNotification: email dispatch failed", { userId: input.userId, err });
        emailStatus = "failed";
      }
    }
  }

  // WhatsApp channel — admin enabled AND user hasn't opted out
  let whatsappStatus: SendNotificationResult["whatsapp"] = "skipped";
  if (
    channels.whatsapp.enabled &&
    userChannelPrefs.whatsapp !== false &&
    resolvedPhone &&
    meetsMinPriority(priority, channels.whatsapp.minPriority) &&
    (!channels.whatsapp.types?.length || channels.whatsapp.types.includes(type))
  ) {
    const phoneNumberId = creds.whatsappPhoneNumberId?.trim() ?? "";
    const accessToken = creds.whatsappCloudApiToken?.trim() ?? "";
    if (phoneNumberId && accessToken) {
      try {
        const ok = await sendWhatsAppBusinessMessage({
          toPhone: resolvedPhone,
          message: `*${title}*\n${message}`,
          phoneNumberId,
          accessToken,
        });
        whatsappStatus = ok ? "sent" : "failed";
      } catch (err) {
        serverLogger.error("sendNotification: WhatsApp dispatch failed", { userId: input.userId, err });
        whatsappStatus = "failed";
      }
    }
  }

  serverLogger.info("sendNotification: dispatched", {
    userId: input.userId,
    type,
    email: emailStatus,
    whatsapp: whatsappStatus,
  });

  return { notification, email: emailStatus, whatsapp: whatsappStatus };
}
