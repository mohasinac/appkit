/**
 * Core: weekly Saturday sweep — converts delivered Shiprocket orders
 * with `payoutStatus=eligible` into pending payout documents grouped by seller.
 */

import {
  storeRepository,
  userRepository,
  orderRepository,
  payoutRepository,
} from "../../../../repositories";
import { BATCH_LIMIT } from "../handlers/messages";
import { getDefaultCurrency } from "../../../../core";
import type { JobContext } from "../runtime/types";

const PLATFORM_COMMISSION_RATE = 0.05;

export async function runWeeklyPayoutEligibility(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting weekly payout eligibility sweep");
  const eligible = await orderRepository.getEligibleShiprocket();
  if (eligible.length === 0) {
    ctx.logger.info("No eligible Shiprocket-delivered orders found");
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
  const defaultCurrency = getDefaultCurrency();

  for (const [storeId, orders] of byStore.entries()) {
    const store = await storeRepository.findBySlug(storeId);
    const seller = store ? await userRepository.findById(store.ownerId) : null;
    if (!store || !seller) {
      ctx.logger.warn(`Store/seller ${storeId} not found — skipping ${orders.length} order(s)`);
      continue;
    }

    const grossAmount = orders.reduce(
      (sum, o) => sum + ((o.data as { totalPrice?: number }).totalPrice ?? 0),
      0,
    );
    const platformFee = Math.round(grossAmount * PLATFORM_COMMISSION_RATE * 100) / 100;
    const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;

    const payoutInput = {
      storeId,
      sellerName: (seller.displayName ?? seller.email ?? store.ownerId) as string,
      sellerEmail: (seller.email ?? "") as string,
      orderIds: orders.map((o) => o.id),
      amount: netAmount,
      grossAmount,
      platformFee,
      platformFeeRate: PLATFORM_COMMISSION_RATE,
      currency: defaultCurrency,
      status: "pending" as const,
      paymentMethod:
        seller.payoutDetails?.method === "upi" ? ("upi" as const) : ("bank_transfer" as const),
      upiId:
        seller.payoutDetails?.method === "upi" ? seller.payoutDetails.upiId : undefined,
      bankAccount:
        seller.payoutDetails?.method === "bank_transfer" && seller.payoutDetails.bankAccount
          ? {
              accountHolderName: seller.payoutDetails.bankAccount.accountHolderName,
              accountNumberMasked: seller.payoutDetails.bankAccount.accountNumberMasked,
              ifscCode: seller.payoutDetails.bankAccount.ifscCode,
              bankName: seller.payoutDetails.bankAccount.bankName,
            }
          : undefined,
      notes: `Automated weekly payout — ${orders.length} Shiprocket delivered order(s)`,
      requestedAt: new Date(),
    };

    const { id: payoutId } = await payoutRepository.create(payoutInput);

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
    ctx.logger.info(`Payout created for store ${storeId}`, {
      payoutId,
      orderCount: orders.length,
      netAmount,
      grossAmount,
      platformFee,
    });
  }

  ctx.logger.info("Weekly payout eligibility sweep complete", { payoutsCreated, ordersProcessed });
}
