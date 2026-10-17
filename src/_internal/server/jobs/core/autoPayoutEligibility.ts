import {
  orderRepository,
  payoutRepository,
  storeRepository,
  userRepository,
  siteSettingsRepository,
} from "../../../../repositories";
import { getDefaultCurrency } from "../../../../core/index";
import { computePayoutDeduction } from "../../../shared/fees/calculator";
import { ordersTaxableValue, type PayableOrderLike } from "../../../shared/checkout/order-math";
import type { JobContext } from "../runtime/types";
import { BATCH_LIMIT } from "../handlers/messages";

const AUTO_PAYOUT_WINDOW_DAYS = 7;

function getBusinessDayCutoff(daysAgo: number): Date {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - daysAgo);
  cutoff.setUTCHours(4, 30, 0, 0);
  return cutoff;
}

export async function runAutoPayoutEligibility(ctx: JobContext): Promise<void> {
  if (ctx.env("FEATURE_PAYOUTS") !== "true") {
    ctx.logger.info("FEATURE_PAYOUTS disabled — skipping auto-payout eligibility");
    return;
  }
  ctx.logger.info("Starting daily auto-payout eligibility sweep", {
    windowDays: AUTO_PAYOUT_WINDOW_DAYS,
  });
  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings.commissions;

  const cutoff = getBusinessDayCutoff(AUTO_PAYOUT_WINDOW_DAYS);
  const eligible = await orderRepository.getEligibleAutomatic(cutoff);

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
    const { platformFee, gatewayFee, gstOnFee: gstAmount, netAmount } = computePayoutDeduction(grossAmount, commissions);

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
