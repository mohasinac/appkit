import { normalizeError } from "../../../errors/normalize";
import { notificationRepository } from "../repository/notification.repository";
import { siteSettingsRepository } from "../repository/site-settings.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { createResendProvider } from "../../../providers/email-resend/provider";
import { isChannelHealthy, withChannelRetry } from "../../../_internal/server/notifications/channel-health";
import { enqueueJob } from "../../jobs/actions/enqueue-job";
import { serverLogger } from "../../../monitoring";
import { decryptPii } from "../../../security/index";
import type { NotificationDocument, NotificationCreateInput } from "../schemas";
import type { NotificationTypePrefs } from "../../account/types";
import type { SiteSettingsCredentials } from "../schemas/firestore";
import type { NotificationType } from "../schemas/firestore";
import {
  resolveNotificationActionUrl,
  TYPE_AUDIENCE,
  type NotificationAudience,
} from "../../../_internal/shared/features/notifications/action-url";
import { renderNotificationEmail } from "../../email/notification-templates";

/**
 * A notification's `actionUrl` is a site-relative path — correct for the
 * in-app bell, useless in an email, where a bare `/user/orders/x` is not a
 * link at all.
 *
 * `NEXT_PUBLIC_APP_URL` is the same source `ApiClient` uses for its own
 * server-side base, so there is one answer to "what host is this" rather than
 * a second one on `siteSettings` to drift from it.
 *
 * Falls back to returning the path unchanged rather than guessing a host: a
 * wrong absolute URL sends the reader to someone else's site, while a
 * relative one merely fails to be clickable. The template also drops the
 * button entirely when this is undefined.
 */
function absoluteActionUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  meetsMinPriority,
} from "../schemas/firestore";

/**
 * Notification types whose WhatsApp send is gated behind the buyer's
 * per-order ₹10 WhatsApp-updates addon (`OrderDocument.whatsappNotifyAddon`)
 * — see `orderWhatsappAddonPaid` on `SendNotificationInput`. Every other
 * type (bid_won, offers, scam reports, support tickets, admin alerts, …)
 * keeps the original two-gate behavior (admin channel enabled + user hasn't
 * opted out) unchanged.
 */
const ORDER_GATED_TYPES = new Set([
  "order_placed",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "refund_initiated",
]);

/**
 * Notification type → the flat `SiteSettingsCredentials` field holding its
 * approved Meta template name.
 *
 * 🛑 **`Partial` here is CORRECT and is not the `typeToPrefsKey` mistake.**
 *
 * The distinction is what a missing key MEANS. A missing `typeToPrefsKey`
 * entry silently ignored a user's opt-out — a real setting that read as
 * honoured and was not. A missing entry here means "no Meta-approved template
 * exists for this type", which is a fact about the Meta account, not a bug:
 * six of the 28 types have one, and the rest legitimately fall back to
 * free-form (which Meta accepts inside the 24-hour customer-service window
 * and rejects outside it — the runner already logs that rejection).
 *
 * Getting six approved templates is a Meta Business review process, not a
 * code change, so listing all 28 here with empty values would be a
 * `Record<…>` that lies about coverage.
 *
 * The six that ARE approved are the order lifecycle, which is also the set
 * gated behind the buyer's ₹10 addon above — the two lists agree on purpose.
 */
const WHATSAPP_TEMPLATE_FIELD: Partial<Record<string, keyof SiteSettingsCredentials>> = {
  order_placed: "whatsappTemplateOrderPlaced",
  order_confirmed: "whatsappTemplateOrderConfirmed",
  order_shipped: "whatsappTemplateOrderShipped",
  order_delivered: "whatsappTemplateOrderDelivered",
  order_cancelled: "whatsappTemplateOrderCancelled",
  refund_initiated: "whatsappTemplateRefundInitiated",
};

function resolveWhatsAppTemplateName(type: string, creds: SiteSettingsCredentials): string {
  const field = WHATSAPP_TEMPLATE_FIELD[type];
  return (field ? creds[field] : undefined)?.trim() ?? "";
}

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
  /** Buyer paid the ₹10 WhatsApp order-updates addon — enables WhatsApp channel for this notification even when the user has no standing WhatsApp subscription. */
  orderWhatsappAddonPaid?: boolean;
  /**
   * Which portal the recipient reads this in — decides where `actionUrl`
   * points when the caller does not supply one.
   *
   * Defaults from the notification TYPE, not from the recipient's role: a
   * seller is also a buyer, and `order_shipped` belongs in `/user` while the
   * payout for that same order belongs in `/store`. Pass it explicitly only
   * when one type genuinely reaches two audiences — `offer_received` goes to
   * the seller, `offer_responded` back to the buyer.
   */
  audience?: NotificationAudience;
}


export interface SendNotificationResult {
  notification: NotificationDocument;
  email: "sent" | "skipped" | "failed";
  /** WhatsApp dispatch is now async (enqueued as a `whatsappNotify` job) — "queued" replaces "sent" as the immediate outcome; the real delivery result lands on `notification.whatsappStatus`. */
  whatsapp: "queued" | "skipped" | "failed";
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
  const { userEmail, userPhone, emailHtml, audience, ...notifInput } = input;

  /*
   * Fill `actionUrl` when the caller did not.
   *
   * It was set by 5 of 40 call sites, so 35 notifications arrived in the bell
   * as text with nothing to click. Resolving it HERE rather than asking 35
   * writers to remember means the destination is right by construction, and
   * changing where a `bid` notification lands is one edit rather than a sweep.
   *
   * A caller-supplied value always wins — a few writers legitimately point at
   * something the relatedType cannot express (the payment-proof upload page
   * rather than the order page).
   */
  const resolvedActionUrl =
    notifInput.actionUrl ??
    resolveNotificationActionUrl(
      notifInput.relatedType,
      notifInput.relatedId,
      audience ?? TYPE_AUDIENCE[notifInput.type as NotificationType] ?? "buyer",
    );

  // Always write the in-app notification first.
  const notification = await notificationRepository.create({
    ...notifInput,
    ...(resolvedActionUrl ? { actionUrl: resolvedActionUrl } : {}),
  });

  // Load channel config + credentials (one Firestore read).
  let settings: Awaited<ReturnType<typeof siteSettingsRepository.getSingleton>>;
  try {
    settings = await siteSettingsRepository.getSingleton();
  } catch (err) {
    void normalizeError(err);
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
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("notification-actions: user prefs lookup failed — defaulting to all channels enabled", { userId: input.userId, error: err instanceof Error ? err.message : String(err) });
  }

  // If caller didn't supply userEmail, try to decrypt it from the already-fetched user doc.
  const resolvedEmail =
    userEmail ??
    (fetchedUserDoc?.email ? (decryptPii(fetchedUserDoc.email) as string | undefined) : undefined);
  const resolvedPhone =
    userPhone ??
    (fetchedUserDoc?.phoneNumber ? (decryptPii(fetchedUserDoc.phoneNumber) as string | undefined) : undefined);

  // Map NotificationType to a NotificationTypePrefs key.
  /*
   * 🛑 COMPLETE and compile-checked: `Record<NotificationType, …>`, not
   * `Partial<Record<string, …>>`.
   *
   * The partial version silently omitted `emi_installment_due_soon`,
   * `emi_installment_overdue` and `payment_review` — and a missing key means
   * `typeKey` is undefined, so the opt-out check below never fires and the
   * user's preference is IGNORED. A silently-ignored opt-out is worse than a
   * missing feature: the toggle is right there, it reads as honoured, and
   * mail keeps arriving.
   *
   * Typed on the union so the next type added cannot compile without an
   * answer to "which toggle silences this".
   */
  const typeToPrefsKey: Record<NotificationType, keyof NotificationTypePrefs> = {
    order_placed: "orderUpdates", order_confirmed: "orderUpdates",
    order_shipped: "orderUpdates", order_delivered: "orderUpdates",
    order_cancelled: "orderUpdates",
    bid_placed: "bids", bid_outbid: "bids", bid_won: "bids", bid_lost: "bids", auction_ended: "bids",
    review_approved: "reviews", review_replied: "reviews",
    promotion: "promotions",
    system: "system", welcome: "system", account_action: "system",
    offer_received: "offers", offer_responded: "offers",
    offer_expired: "offers", offer_counter_accepted: "offers",
    refund_initiated: "orderUpdates",
    product_available: "system",
    prize_won: "orderUpdates",
    prize_reveal_expired: "orderUpdates",
    // Money owed on an order. Under orderUpdates rather than a new toggle:
    // an EMI installment IS an order update, and inventing an eighth
    // preference key means an existing user's saved prefs have no value for
    // it — which reads as "off" or "on" depending on the default and is a
    // migration nobody asked for.
    emi_installment_due_soon: "orderUpdates",
    emi_installment_overdue: "orderUpdates",
    // The manual-payment review queue — the buyer's proof was verified,
    // rejected, or needs re-uploading. Squarely an order update.
    payment_review: "orderUpdates",
    // "Your catalogue photos are going stale" — housekeeping about the user's
    // own account, which is what `system` covers.
    catalogue_images_stale: "system",
  };
  const typeKey = typeToPrefsKey[type as NotificationType];
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
    if (apiKey && !apiKey.includes("PLACEHOLDER") && (await isChannelHealthy("email"))) {
      try {
        const emailProvider = createResendProvider({ apiKey, fromEmail, fromName });
        await withChannelRetry("email", () =>
          emailProvider.send({
            to: resolvedEmail,
            subject: title,
            /*
             * A real template, not `<p>{message}</p>`.
             *
             * `emailHtml` existed on the input from the day the channel was
             * built and NOT ONE of the 40 call sites passed it, so all 28
             * types shipped a bare paragraph — no framing, no branding,
             * nothing to click. Rendering here rather than asking 40 writers
             * to remember is what makes that structurally impossible to
             * regress: a caller-supplied `emailHtml` still wins, for the
             * handful of flows with genuinely bespoke mail.
             */
            html:
              emailHtml ??
              renderNotificationEmail(type as NotificationType, {
                title,
                message,
                siteName: fromName,
                actionUrl: absoluteActionUrl(resolvedActionUrl),
              }),
            text: message,
          }),
        );
        emailStatus = "sent";
      } catch (err) {
        void normalizeError(err);
        serverLogger.error("sendNotification: email dispatch failed", { userId: input.userId, err });
        emailStatus = "failed";
      }
    }
  }

  // WhatsApp channel — admin enabled AND user hasn't opted out AND (for
  // order-lifecycle types) the buyer paid the per-order WhatsApp addon.
  let whatsappStatus: SendNotificationResult["whatsapp"] = "skipped";
  if (
    channels.whatsapp.enabled &&
    userChannelPrefs.whatsapp !== false &&
    resolvedPhone &&
    meetsMinPriority(priority, channels.whatsapp.minPriority) &&
    (!channels.whatsapp.types?.length || channels.whatsapp.types.includes(type)) &&
    (!ORDER_GATED_TYPES.has(type) || input.orderWhatsappAddonPaid === true)
  ) {
    const phoneNumberId = creds.whatsappPhoneNumberId?.trim() ?? "";
    const accessToken = creds.whatsappCloudApiToken?.trim() ?? "";
    if (phoneNumberId && accessToken) {
      try {
        const { jobId } = await enqueueJob({
          jobType: "whatsappNotify",
          payload: {
            toPhone: resolvedPhone,
            title,
            message,
            type,
            templateName: resolveWhatsAppTemplateName(type, creds),
            templateLanguage: creds.whatsappTemplateLanguage ?? "en",
            notificationId: notification.id,
            phoneNumberId,
            accessToken,
          },
          requestedBy: input.userId,
        });
        whatsappStatus = "queued";
        await notificationRepository
          .update(notification.id, { whatsappStatus: "queued", whatsappJobId: jobId } as never)
          .catch((err: unknown) => {
            void normalizeError(err);
            serverLogger.warn("sendNotification: failed to write whatsappJobId onto notification doc", { notificationId: notification.id });
          });
      } catch (err) {
        void normalizeError(err);
        serverLogger.error("sendNotification: WhatsApp job enqueue failed", { userId: input.userId, err });
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
