/**
 * Core: weekly Saturday sweep — converts delivered orders with
 * `payoutStatus=eligible` into pending payout documents grouped by seller.
 */

import {
  storeRepository,
  userRepository,
  orderRepository,
  payoutRepository,
  siteSettingsRepository,
} from "../../../../repositories";
import { BATCH_LIMIT } from "../handlers/messages";
import { getDefaultCurrency } from "../../../../core";
import { computePayoutDeduction } from "../../../shared/fees/calculator";
import { ordersTaxableValue, type PayableOrderLike } from "../../../shared/checkout/order-math";
import type { JobContext } from "../runtime/types";

export interface WeeklyPayoutEligibilityResult {
  payoutsCreated: number;
  ordersProcessed: number;
  payoutIds: string[];
}

export async function runWeeklyPayoutEligibility(
  ctx: JobContext,
): Promise<WeeklyPayoutEligibilityResult> {
  if (ctx.env("FEATURE_PAYOUTS") !== "true") {
    ctx.logger.info("FEATURE_PAYOUTS disabled — skipping weekly payout eligibility");
    return { payoutsCreated: 0, ordersProcessed: 0, payoutIds: [] };
  }
  ctx.logger.info("Starting weekly payout eligibility sweep");
  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings.commissions;
  const eligible = await orderRepository.getEligibleForPayoutSweep();
  if (eligible.length === 0) {
    ctx.logger.info("No eligible delivered orders found");
    return { payoutsCreated: 0, ordersProcessed: 0, payoutIds: [] };
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
  const payoutIds: string[] = [];
  const defaultCurrency = getDefaultCurrency();

  for (const [storeId, orders] of byStore.entries()) {
    const store = await storeRepository.findBySlug(storeId);
    const seller = store ? await userRepository.findById(store.ownerId) : null;
    if (!store || !seller) {
      ctx.logger.warn(`Store/seller ${storeId} not found — skipping ${orders.length} order(s)`);
      continue;
    }

    /* The TAXABLE VALUE — see `orderTaxableValue`. This job and
     * `autoPayoutEligibility` must agree, or the weekly run and the automatic
     * one pay different amounts for the same orders. */
    const grossAmount = ordersTaxableValue(
      orders.map((o) => o.data as PayableOrderLike),
    );
    const { platformFee, gatewayFee, gstOnFee, netAmount } = computePayoutDeduction(grossAmount, commissions);

    /*
     * 🛑 REVEALED before building a payout — see the identical note in
     * `autoPayoutEligibility.ts`. `findById` is ciphertext-by-default and
     * `createPayout` encrypts `sellerEmail`/`upiId` again, so the stored
     * values went in double-encrypted and permanently unreadable, and the
     * HMAC'd `sellerEmailIndex` could never match a real lookup.
     */
    const sellerPlain = userRepository.revealUser(seller);

    const payoutInput = {
      storeId,
      // `displayName` is plaintext by D1; the email fallback must be revealed.
      sellerName: (seller.displayName ?? sellerPlain.email ?? store.ownerId) as string,
      sellerEmail: sellerPlain.email ?? "",
      orderIds: orders.map((o) => o.id),
      amount: netAmount,
      grossAmount,
      platformFee,
      platformFeeRate: commissions.platformFeePercent / 100,
      gatewayFee,
      gatewayFeeRate: (commissions.gatewayFeePercent ?? 0) / 100,
      gstAmount: gstOnFee,
      gstRate: commissions.gstPercent / 100,
      currency: defaultCurrency,
      status: "pending" as const,
      paymentMethod:
        sellerPlain.payoutDetails?.method === "upi" ? ("upi" as const) : ("bank_transfer" as const),
      upiId:
        sellerPlain.payoutDetails?.method === "upi" ? sellerPlain.payoutDetails.upiId : undefined,
      bankAccount:
        sellerPlain.payoutDetails?.method === "bank_transfer" && sellerPlain.payoutDetails.bankAccount
          ? {
              accountHolderName: sellerPlain.payoutDetails.bankAccount.accountHolderName,
              accountNumberMasked: sellerPlain.payoutDetails.bankAccount.accountNumberMasked,
              ifscCode: sellerPlain.payoutDetails.bankAccount.ifscCode,
              bankName: sellerPlain.payoutDetails.bankAccount.bankName,
            }
          : undefined,
      notes: `Automated weekly payout — ${orders.length} delivered order(s)`,
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

    payoutsCreated++;
    ordersProcessed += orders.length;
    payoutIds.push(payoutId);
    ctx.logger.info(`Payout created for store ${storeId}`, {
      payoutId,
      orderCount: orders.length,
      netAmount,
      grossAmount,
      platformFee,
    });
  }

  ctx.logger.info("Weekly payout eligibility sweep complete", { payoutsCreated, ordersProcessed });
  return { payoutsCreated, ordersProcessed, payoutIds };
}
