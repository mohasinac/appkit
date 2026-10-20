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
import { isEmailEligible } from "../../../_internal/shared/features/notifications/email-eligibility";
import { renderNotificationEmail } from "../../email/notification-templates";
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  meetsMinPriority,
} from "../schemas/firestore";

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
  /** Pre-rendered email HTML — falls back to a plain-text <p> when absent. */
  emailHtml?: string;
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
  /**
   * Bypass `EMAIL_ELIGIBLE_TYPES` for THIS send, because a human explicitly
   * asked for it.
   *
   * The only caller is the support-ticket reply route, where a staff member
   * ticked "also email the user" on a reply. `support_ticket_update` is
   * ineligible by default precisely so routine back-and-forth costs nothing —
   * this is the escape hatch for the reply that genuinely has to reach an
   * inbox.
   *
   * 🛑 It bypasses ELIGIBILITY ONLY. The kill switch, the daily ceiling, the
   * channel config and the user's own opt-out all still apply — a staff tick
   * is a request, not an override of the site's posture or of the recipient's
   * stated preference.
   *
   * Deliberately a named literal rather than `boolean`: a `force: true` reads
   * as "send harder" at the call site and invites reuse, while
   * `"staff_requested"` states who is accountable for the send.
   */
  eligibilityOverride?: "staff_requested";
}


export interface SendNotificationResult {
  notification: NotificationDocument;
  email: "sent" | "skipped" | "failed";
}

/**
 * Create an in-app notification and fan out to enabled external channels.
 *
 * In-app is always written. Email is sent only when:
 *   1. The channel is enabled in siteSettings.notificationChannels
 *   2. Notification priority meets the channel's minPriority threshold
 *   3. The optional `types` filter includes this notification type (or is absent)
 *   4. The contact field (userEmail) is supplied by the caller
 *   5. The required credentials are set in siteSettings.credentials
 */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const { userEmail, emailHtml, audience, eligibilityOverride, ...notifInput } = input;

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

  /*
   * 🛑 The eligibility gate, and it is FIRST for a reason.
   *
   * `EMAIL_ELIGIBLE_TYPES` (see that file for the full argument) decides
   * whether a type may leave the building at all. Checking it here — before
   * the siteSettings read and before the user-prefs read — is what makes the
   * expensive fan-outs free:
   *
   *   `auctionSettlement` sends `bid_lost` to up to 50 losing bidders in
   *   parallel per auction. Each of those calls would otherwise pay TWO
   *   Firestore reads (settings + user doc) to arrive at "skipped". That is
   *   100 reads per auction to send nothing, and every expired auction settles
   *   concurrently.
   *
   * Returning here costs zero reads, and it is also what lets the daily send
   * counter stay a single unsharded document: the only remaining concurrent
   * fan-out never reaches the counter.
   *
   * The bell is already filled by the write above, so nothing is lost — this
   * suppresses the emailed/messaged COPY, not the notification.
   *
   * One map gates both channels deliberately. If a type is ever genuinely
   * worth a channel of its own, split the map then rather than
   * loosening this early return.
   */
  if (
    !isEmailEligible(notifInput.type as NotificationType) &&
    eligibilityOverride !== "staff_requested"
  ) {
    return { notification, email: "skipped" };
  }

  // Load channel config + credentials (one Firestore read).
  let settings: Awaited<ReturnType<typeof siteSettingsRepository.getSingleton>>;
  try {
    settings = await siteSettingsRepository.getSingleton();
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("sendNotification: could not load siteSettings — skipping external channels", { err });
    return { notification, email: "skipped" };
  }

  const channels = settings.notificationChannels ?? DEFAULT_NOTIFICATION_CHANNELS;
  const creds = settings.credentials ?? {};
  const { type, priority, title, message } = notifInput;

  // Load user notification preferences (best-effort — if missing, all channels allowed).
  let userChannelPrefs: { email?: boolean; sms?: boolean } = {};
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

  /*
   * The NAMED accessor, not two bare `decryptPii` casts.
   *
   * These already decrypted and already worked, but the casts defeated the
   * brand — so a grep for `reveal*` could not tell this reader from an
   * unconverted one. `revealUser` is the same decision, stated.
   *
   * Revealed rather than masked because this notification is DELIVERED: a
   * masked address cannot receive mail.
   */
  const fetchedUserPlain = fetchedUserDoc
    ? userRepository.revealUser(fetchedUserDoc)
    : null;
  const resolvedEmail = userEmail ?? fetchedUserPlain?.email ?? undefined;

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
    /*
     * Both land under `system` rather than getting new preference keys.
     *
     * Same reasoning as the EMI note above: an eighth and ninth key would have
     * no stored value on any existing user, so it reads as on or off purely by
     * accident of the default — a silent migration nobody asked for. And
     * neither is something a user would plausibly want to silence
     * independently: a ticket update is a reply to a conversation THEY started,
     * and a scam-report outcome is the answer to a report THEY filed.
     */
    support_ticket_update: "system",
    scam_report_update: "system",
    // D9 — same reasoning: a tenth key would have no stored value on any
    // existing user, and a chat message is a reply to a thread the user is
    // already a participant in, not something to silence independently.
    message_received: "system",
  };
  const typeKey = typeToPrefsKey[type as NotificationType];
  // If the user has explicitly disabled this notification type, skip all external channels.
  if (typeKey && userTypePrefs[typeKey] === false) {
    return { notification, email: "skipped" };
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

  serverLogger.info("sendNotification: dispatched", {
    userId: input.userId,
    type,
    email: emailStatus,
  });

  return { notification, email: emailStatus };
}
