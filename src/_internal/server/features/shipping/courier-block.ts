/**
 * Raising and clearing a courier block, and telling the ADMIN about it.
 *
 * ## The problem this exists for
 *
 * Shiprocket is PREPAID and has no recharge API, so topping up the courier
 * wallet is irreducibly a human action. If the platform books couriers, an
 * empty wallet silently stops dispatch on orders buyers have already paid for.
 *
 * ## The two rules
 *
 * 1. 🛑 **The order is never auto-cancelled over it.** `seller-dispatch`'s
 *    `precondition` carries `!hasOpenCourierBlock(o)`, so its 2-business-day
 *    `onDue: "act"` clock PAUSES while blocked instead of cancelling the order
 *    and refunding the buyer with the seller blamed for our funding state.
 *
 * 2. 🛑 **The admin alert is deduped on the WALLET, never on the order.** Fifty
 *    blocked orders are ONE problem with one fix. The daily email ceiling
 *    applies to staff mail too (`send-guard.ts:92` — the kill switch spares
 *    staff, the ceiling does not), so fifty per-order emails would spend the
 *    whole 80/day budget saying the same thing fifty times and leave the
 *    operator blind to everything else.
 */

import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
// `adminNotificationsRepository` lives behind the repositories barrel — the
// same import the two existing staff-signal call sites use.
import { adminNotificationsRepository } from "../../../../repositories";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { sendEmail } from "../../../../features/contact/email";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import type { WalletBalance } from "../../../../contracts";

/**
 * ## 🛑 What is HERE and what deliberately is not
 *
 * Shipped: the wallet THRESHOLD check and the whole admin-alert path, driven by
 * the daily digest. That is a real producer today and needs nothing new — and
 * it is the better signal anyway: reacting only to failures means the first
 * warning is always a buyer's order already stuck.
 *
 * NOT shipped: raising a block on a specific order. That belongs with the
 * booking path, and nothing platform-books yet (`createShipment` has zero
 * callers). A `raiseCourierBlock` with no producer is the speculative-infra
 * pattern, so it lands when the caller does.
 *
 * `OrderDocument.courierBlock` and `seller-dispatch`'s
 * `!hasOpenCourierBlock(o)` guard ARE already in place, and that ordering is
 * deliberate: a safety property must exist BEFORE the thing it guards against,
 * or the very first block auto-cancels a paid order. Inert today, correct the
 * moment anything writes the field.
 */

/** Why we could not book. Mirrors `OrderDocument.courierBlock.reason`. */
export type CourierBlockReason = NonNullable<OrderDocument["courierBlock"]>["reason"];

/**
 * The dedupe key: the PROVIDER, not the order.
 *
 * One string, so a hundred stuck orders collapse into one case whose
 * `observedCount` is the number of orders waiting — which is also the only
 * number an operator actually needs in order to decide how urgently to top up.
 */
function walletCaseKey(provider: string): string {
  return `courier-wallet:${provider}`;
}

/**
 * How many shipments' worth of balance counts as "low".
 *
 * 🛑 Expressed in SHIPMENTS, not rupees. A ₹500 floor is meaningless without
 * knowing what a booking costs, and the question an operator is really asking
 * is "how many more parcels can I send before this stops". Four is roughly a
 * day's slack at this volume, which is the point: the alert should arrive while
 * topping up is still routine.
 *
 * `TYPICAL_BOOKING_COST` is an ESTIMATE and is labelled one — the real figure
 * per parcel comes from `checkServiceability` and varies by weight and
 * destination. It only has to be the right order of magnitude to make the
 * warning land before the wallet is actually empty.
 */
const LOW_BALANCE_SHIPMENTS = 4;
const TYPICAL_BOOKING_COST = 80;

export interface CourierWalletCheck {
  /** `null` when the provider has no wallet, or we could not read it. */
  balance: number | null;
  low: boolean;
  alerted: boolean;
  reason?: string;
}

/**
 * Read the courier wallet and, if it is running low, alert the admin ONCE.
 *
 * Called from `dailyStatusDigest` — 🛑 deliberately NOT a new scheduled
 * function. Cloud Scheduler bills per registered job and this is one read a
 * day; the same reasoning that put the ledger reconciler inside
 * `dailyDataCleanup`.
 *
 * Never throws: a wallet read is diagnostics, and a digest that fails because
 * one provider was unreachable stops reporting the fifteen things that were
 * fine.
 */
export async function checkCourierWalletAndAlert(
  /*
   * 🛑 Accepts `undefined` rather than being handed a cast.
   * `ProviderRegistry.shipping` is declared optional, and although
   * `providers.config.ts` always populates it, that is a runtime guarantee the
   * TYPE does not make — and `as IShippingProvider` would silence the one
   * signal that the registry was never initialised.
   */
  provider: { name: string; getWalletBalance: () => Promise<WalletBalance> } | undefined,
): Promise<CourierWalletCheck> {
  if (!provider) {
    return { balance: null, low: false, alerted: false, reason: "no shipping provider" };
  }

  let balance: WalletBalance;
  try {
    balance = await provider.getWalletBalance();
  } catch (err) {
    const e = normalizeError(err);
    return { balance: null, low: false, alerted: false, reason: e.message };
  }

  if (!balance.known) {
    /*
     * 🛑 No alert, and no "balance 0" either. An unreadable balance is not a
     * low balance — alerting on it would page an operator every time the
     * network hiccupped, and they would learn to ignore the one that mattered.
     * The reason is returned so the digest can SAY it was unreadable.
     */
    return {
      balance: null,
      low: false,
      alerted: false,
      reason: balance.supported ? (balance.reason ?? "unreadable") : "no wallet",
    };
  }

  const low = balance.amount < LOW_BALANCE_SHIPMENTS * TYPICAL_BOOKING_COST;
  if (!low) return { balance: balance.amount, low: false, alerted: false };

  const alerted = await alertAdminOnce({
    provider: provider.name,
    reason: "insufficient_funds",
    detail: `balance ${balance.amount}`,
  }).catch((err: unknown) => {
    const e = normalizeError(err);
    serverLogger.error("courier-wallet: admin alert failed", {
      provider: provider.name,
      error: e.message,
    });
    return false;
  });

  return { balance: balance.amount, low: true, alerted };
}

/**
 * One case, one in-app alert, one email — per WALLET, per unresolved episode.
 *
 * `openOrObserve` is what makes this idempotent: a second blocked order raises
 * `observedCount` on the existing case rather than opening a new one, and the
 * email is only sent when a case was actually OPENED.
 */
async function alertAdminOnce(input: {
  provider: string;
  reason: CourierBlockReason;
  detail?: string;
}): Promise<boolean> {
  const { provider, reason, detail } = input;
  const key = walletCaseKey(provider);

  const title =
    reason === "insufficient_funds"
      ? `Courier wallet needs a top-up (${provider})`
      : `Courier booking failing (${provider})`;

  const result = await paymentCasesRepository.openOrObserve({
    kind: "courier_unavailable",
    /*
     * 🛑 `subjectId` identifies THE PROBLEM, not the observation — the
     * repository's own words, and here the problem is the wallet. Passing the
     * order id would open one case per stuck order, which is the exact noise
     * `openOrObserve` exists to prevent ("an operator learns to ignore it, and
     * the first real chargeback is lost in 8,000 rows").
     */
    subjectId: key,
    severity: "error",
    title,
    detail:
      reason === "insufficient_funds"
        ? `Bookings are failing for lack of funds. Paid orders are waiting and are NOT being auto-cancelled. Top up the ${provider} wallet, then retry from the order.`
        : `Bookings are failing (${reason}). Paid orders are waiting and are NOT being auto-cancelled.${detail ? ` Upstream: ${detail.slice(0, 200)}` : ""}`,
    /*
     * The entity is the STORE-agnostic provider, so `entityType: "store"` would
     * be a lie and `"order"` would re-key it to one order. `"job"` is the
     * closest honest member of that union: this is a piece of our own
     * machinery failing, not one record being wrong.
     */
    entityType: "job",
    entityId: key,
  });

  /*
   * 🛑 Only on a NEWLY CREATED case. This is the whole dedupe: an already-open
   * episode has already been emailed, and re-sending it daily — or once per
   * blocked order, once booking is wired — is the budget bug this function
   * exists to avoid. The daily ceiling applies to staff mail too.
   */
  if (!result.created) return false;

  // One durable staff row the admin inbox reads and the digest counts —
  // `audienceUserIds: []` is the "staff signal is a record, not a blast"
  // pattern, rather than N personal notifications.
  await adminNotificationsRepository
    .create({
      /*
       * No cast. The fields are the real `AdminNotificationDocument` ones —
       * `category`, not `type` — because a cast here would silence every other
       * field's check too, which is how the `as never` on the older catalogue
       * handler hid a wrong `createdAt` (CLAUDE.md § Notifications).
       */
      category: "system",
      severity: "error",
      title,
      body: `${title}. Paid orders are waiting; none will be auto-cancelled while this is open.`,
      isRead: false,
      entityType: "job",
      entityId: key,
      audienceUserIds: [],
    })
    .catch((err: unknown) => {
      void normalizeError(err);
    });

  await emailStaff({ title, provider, reason });
  return true;
}

/**
 * The staff email.
 *
 * 🛑 `feature` is a NAMED FLOW, not a `NotificationType`, and that is a
 * deliberate correction to the plan this came from.
 *
 * `SendGuardContext.feature` is documented as "a notification type, or a named
 * non-notification flow (`daily_digest`, `checkout_otp`, `payout_summary`)",
 * and this is the second kind. A `NotificationType` is addressed to a USER and
 * carries preferences, templates and an audience — none of which make sense
 * here: nobody can opt out of "the courier wallet is empty", and there is no
 * user it belongs to. Adding one would have meant four compile-checked map
 * entries describing a notification nobody receives.
 *
 * `audience: "staff"` is load-bearing: the admin kill switch suppresses
 * user-facing mail only, so switching customer email off must not stop the
 * operator finding out that paid orders have stopped moving.
 */
async function emailStaff(input: {
  title: string;
  provider: string;
  reason: CourierBlockReason;
}): Promise<void> {
  const settings = await siteSettingsRepository.getSingleton().catch((err: unknown) => {
    void normalizeError(err);
    return null;
  });

  // Same recipient list the daily digest uses — one place to configure "who
  // hears about operational problems".
  const recipients = (settings?.emailSettings?.dailyDigest?.recipients ?? []).filter(
    (r) => r.trim().length > 0,
  );
  if (recipients.length === 0) {
    serverLogger.warn("courier-block: no staff recipients configured — case raised, no email", {
      provider: input.provider,
    });
    return;
  }

  const body =
    input.reason === "insufficient_funds"
      ? `Courier bookings are failing for lack of funds on the ${input.provider} wallet.\n\nPaid orders are waiting. They are NOT being auto-cancelled — the dispatch clock is paused while this is open.\n\nTop up the wallet, then retry from the order or the money-cases queue.`
      : `Courier bookings are failing on ${input.provider} (${input.reason}).\n\nPaid orders are waiting. They are NOT being auto-cancelled — the dispatch clock is paused while this is open.`;

  const { error } = await sendEmail(
    {
      to: recipients,
      subject: input.title,
      html: `<p>${body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`,
      text: body,
    },
    { channel: "email", feature: "courier_wallet_low", audience: "staff" },
  );

  if (error) {
    serverLogger.error("courier-block: staff email failed", {
      provider: input.provider,
      error: String(error),
    });
  }
}

