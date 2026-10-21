import {
  orderRepository,
  payoutRepository,
  storeRepository,
  userRepository,
  siteSettingsRepository,
} from "../../../../repositories";
import { getDefaultCurrency } from "../../../../core/index";
import { computePayoutDeduction } from "../../../shared/fees/calculator";
import { payoutCutoff } from "../../../shared/fees/payout-hold";
import { PROTECTION_CLAIM_WINDOW_HOURS } from "../../../shared/features/shipping/protections";
import {
  ordersTaxableValue,
  ordersShippingReimbursement,
  type PayableOrderLike,
  type ReimbursableOrderLike,
} from "../../../shared/checkout/order-math";
import type { JobContext } from "../runtime/types";
import { BATCH_LIMIT } from "../handlers/messages";

/*
 * 🛑 `AUTO_PAYOUT_WINDOW_DAYS = 7` and `getBusinessDayCutoff` were REMOVED on
 * 2026-10-21. Do not reinstate either.
 *
 * The constant was a hardcoded duplicate of `commissions.payoutHoldDays`,
 * which no code read (D28) — so the admin-facing setting was inert while this
 * number decided every payout.
 *
 * The helper was worse: it did `cutoff.setUTCDate(cutoff.getUTCDate() -
 * daysAgo)`, i.e. it subtracted CALENDAR days under a name that said business
 * days. Measured from Monday 2026-10-19, 7 business days back is 2026-10-08
 * and that helper returned 2026-10-12 — **four calendar days short**, so the
 * stated 7-business-day hold was really about five, and every hold spanning a
 * weekend released early in the seller's favour with nothing recording that
 * the stated hold had not been honoured.
 *
 * Both now come from `payoutCutoff`, which is shared with
 * `weeklyPayoutEligibility` so the two sweeps cannot disagree about the hold —
 * they did, and one of them had no cutoff at all.
 */

export async function runAutoPayoutEligibility(ctx: JobContext): Promise<void> {
  // `FEATURE_PAYOUTS` gate deleted 2026-10-19 — see `auctionSettlement.ts`.
  // This was the one flag actually set (`functions/.env.letitrip-in-app`), so
  // unlike its four siblings this job was running; removing the gate is a
  // no-op in behaviour and removes the lever that could silently stop payouts.
  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings.commissions;

  const { cutoff, hold } = payoutCutoff(
    {
      payoutHoldDays: commissions?.payoutHoldDays,
      returnWindowDays: siteSettings.returns?.windowDays,
      maxClaimWindowHours: Math.max(
        PROTECTION_CLAIM_WINDOW_HOURS.shipping,
        PROTECTION_CLAIM_WINDOW_HOURS.sale,
      ),
    },
    { onWarn: (m, meta) => ctx.logger.warn(m, meta) },
  );

  /*
   * Log the hold AND which input won. The admin setting is seeded at 2 days
   * against a 7-day floor, so the honoured value will usually not be the one
   * they configured — saying `source: "floor"` is what stops that reading as
   * a bug to whoever set it.
   */
  ctx.logger.info("Starting daily auto-payout eligibility sweep", {
    holdDays: hold.days,
    holdSource: hold.source,
    floorDays: hold.floor,
    configured: commissions?.payoutHoldDays ?? null,
    cutoff: cutoff.toISOString(),
  });

  const eligible = await orderRepository.getEligibleAutomatic(cutoff, {
    onWarn: (m, meta) => ctx.logger.warn(m, meta),
  });

  if (eligible.length === 0) {
    ctx.logger.info("No auto-payout eligible orders found");
    return;
  }

  ctx.logger.info(`Found ${eligible.length} eligible order(s) — grouping by seller`);

  const byStore = new Map<string, typeof eligible>();
  for (const entry of eligible) {
    const storeId = (entry.data as { storeId?: string }).storeId;
    if (!storeId) {
      ctx.logger.warn(`Order ${entry.id} has no storeId — skipping`);
      continue;
    }
    if (!byStore.has(storeId)) byStore.set(storeId, []);
    byStore.get(storeId)!.push(entry);
  }

  let payoutsCreated = 0;
  let ordersProcessed = 0;

  for (const [storeId, orders] of byStore.entries()) {
    const store = await storeRepository.findBySlug(storeId);
    const seller = store ? await userRepository.findById(store.ownerId) : null;
    if (!seller) {
      ctx.logger.warn(
        `Store/seller ${storeId} not found — skipping ${orders.length} order(s)`,
        { orderIds: orders.map((o) => o.id) },
      );
      continue;
    }
    /*
     * 🛑 REVEALED before building a payout. This is the fix for active data
     * corruption, not a style change.
     *
     * `userRepository.findById` is ciphertext-by-default, and
     * `payoutRepository.createPayout` ENCRYPTS `sellerEmail` and `upiId`
     * (`PAYOUT_PII_FIELDS`). Passing the stored values straight through
     * encrypted them a SECOND time, and nothing in the codebase ever
     * double-decrypts — so every payout this cron wrote carried a
     * permanently unreadable `upiId`, which is the field the money is sent to.
     *
     * It also poisoned the blind index: `piiIndicesFor` HMACs whatever it is
     * given, so hashing already-encrypted input produced a valid-looking
     * `sellerEmailIndex` that can never match a lookup by the real address.
     *
     * `payoutDetails` needs its own unwrap because it is encrypted by
     * `encryptPayoutDetails`, a separate scheme from the `piiFields` path, so
     * `revealUser` handles it explicitly.
     */
    const sellerPlain = userRepository.revealUser(seller);
    const sellerId = store!.ownerId;

    /*
     * The TAXABLE VALUE — see `orderTaxableValue`. Two narrowings, both
     * needed, and the variable keeps the name `grossAmount` only because
     * `PayoutDocument.grossAmount` does:
     *
     *  1. not `totalPrice`, the grand total, which folds in GST, the platform
     *     fee the buyer already paid, shipping, COD handling, add-ons and the
     *     EMI surcharge — so it paid out our GST, took the fee twice, and
     *     computed every percentage on an inflated base;
     *  2. not the gross goods value either, because prices are tax-INCLUSIVE,
     *     so the goods value still has our GST inside it.
     */
    const grossAmount = ordersTaxableValue(
      orders.map((o) => o.data as PayableOrderLike),
    );
    const { platformFee, gatewayFee, gstOnFee: gstAmount, netAmount } = computePayoutDeduction(
      grossAmount,
      commissions,
      /*
       * D45 — postage refunded to the seller, added AFTER the fee bases so no
       * commission is charged on a cost being refunded. `.data` for the same
       * reason `ordersTaxableValue` above needs it: `orders` holds
       * `{ id, data }` wrappers, and passing the wrapper would read every field
       * as undefined and silently reimburse zero.
       */
      ordersShippingReimbursement(orders.map((o) => o.data as ReimbursableOrderLike)),
    );

    const payoutInput = {
      storeId,
      // `displayName` is plaintext by D1; the email fallback must be revealed.
      sellerName: (seller.displayName ?? sellerPlain.email ?? sellerId) as string,
      sellerEmail: sellerPlain.email ?? "",
      orderIds: orders.map((o) => o.id),
      amount: netAmount,
      grossAmount,
      platformFee,
      platformFeeRate: commissions.platformFeePercent / 100,
      gatewayFee,
      gatewayFeeRate: (commissions.gatewayFeePercent ?? 0) / 100,
      gstAmount,
      gstRate: commissions.gstPercent / 100,
      isAutomatic: true,
      currency: getDefaultCurrency(),
      status: "pending" as const,
      paymentMethod:
        sellerPlain.payoutDetails?.method === "upi"
          ? ("upi" as const)
          : ("bank_transfer" as const),
      upiId:
        sellerPlain.payoutDetails?.method === "upi"
          ? sellerPlain.payoutDetails.upiId
          : undefined,
      /*
       * Only the MASKED account fields are copied, which is why this block
       * escaped the double-encryption above — `accountNumberMasked`,
       * `ifscCode` and `bankName` are in no PII list. The real
       * `accountNumber` is deliberately not carried onto the payout.
       */
      bankAccount:
        sellerPlain.payoutDetails?.method === "bank_transfer" &&
        sellerPlain.payoutDetails.bankAccount
          ? {
              accountHolderName: sellerPlain.payoutDetails.bankAccount.accountHolderName,
              accountNumberMasked: sellerPlain.payoutDetails.bankAccount.accountNumberMasked,
              ifscCode: sellerPlain.payoutDetails.bankAccount.ifscCode,
              bankName: sellerPlain.payoutDetails.bankAccount.bankName,
            }
          : undefined,
      notes: `Auto-payout — ${orders.length} delivered order(s) past ${AUTO_PAYOUT_WINDOW_DAYS}-day window`,
      requestedAt: new Date(),
    };

    const { id: payoutId } = await payoutRepository.createPayout(payoutInput);

    for (let i = 0; i < orders.length; i += BATCH_LIMIT) {
      const slice = orders.slice(i, i + BATCH_LIMIT);
      const batch = ctx.db.batch();
      for (const entry of slice) {
        orderRepository.markPayoutRequested(batch, entry.ref, payoutId);
      }
      await batch.commit();
    }

    ctx.logger.info(`Auto-payout created for store ${storeId}`, {
      payoutId,
      orderCount: orders.length,
      grossAmount,
      platformFee,
      gatewayFee,
      gstAmount,
      netAmount,
    });

    payoutsCreated++;
    ordersProcessed += orders.length;
  }

  ctx.logger.info("Daily auto-payout eligibility sweep complete", {
    payoutsCreated,
    ordersProcessed,
  });
}
