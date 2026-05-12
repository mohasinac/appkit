import {
  orderRepository,
  payoutRepository,
  storeRepository,
  userRepository,
} from "../../../../repositories";
import { getDefaultCurrency } from "../../../../core/index";
import type { ScheduleHandler } from "../runtime/types";
import { BATCH_LIMIT } from "./messages";

const AUTO_PAYOUT_WINDOW_DAYS = 7;
const PLATFORM_COMMISSION_RATE = 0.05;
const GATEWAY_FEE_RATE = 0.0236;
const GST_RATE = 0.18;

/** Returns the start of the business day N days ago (10 AM IST = 04:30 UTC). */
function getBusinessDayCutoff(daysAgo: number): Date {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - daysAgo);
  cutoff.setUTCHours(4, 30, 0, 0);
  return cutoff;
}

export const autoPayoutEligibilityHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Starting daily auto-payout eligibility sweep", {
    windowDays: AUTO_PAYOUT_WINDOW_DAYS,
  });

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
    const sellerId = store!.ownerId;

    const grossAmount = orders.reduce(
      (sum, o) => sum + ((o.data as { totalPrice?: number }).totalPrice ?? 0),
      0,
    );
    const platformFee = Math.round(grossAmount * PLATFORM_COMMISSION_RATE * 100) / 100;
    const gatewayFee = Math.round(grossAmount * GATEWAY_FEE_RATE * 100) / 100;
    const gstAmount = Math.round(platformFee * GST_RATE * 100) / 100;
    const netAmount =
      Math.round((grossAmount - platformFee - gatewayFee - gstAmount) * 100) / 100;

    const payoutInput = {
      storeId,
      sellerName: (seller.displayName ?? seller.email ?? sellerId) as string,
      sellerEmail: (seller.email ?? "") as string,
      orderIds: orders.map((o) => o.id),
      amount: netAmount,
      grossAmount,
      platformFee,
      platformFeeRate: PLATFORM_COMMISSION_RATE,
      gatewayFee,
      gatewayFeeRate: GATEWAY_FEE_RATE,
      gstAmount,
      gstRate: GST_RATE,
      isAutomatic: true,
      currency: getDefaultCurrency(),
      status: "pending" as const,
      paymentMethod:
        seller.payoutDetails?.method === "upi"
          ? ("upi" as const)
          : ("bank_transfer" as const),
      upiId:
        seller.payoutDetails?.method === "upi" ? seller.payoutDetails.upiId : undefined,
      bankAccount:
        seller.payoutDetails?.method === "bank_transfer" &&
        seller.payoutDetails.bankAccount
          ? {
              accountHolderName: seller.payoutDetails.bankAccount.accountHolderName,
              accountNumberMasked: seller.payoutDetails.bankAccount.accountNumberMasked,
              ifscCode: seller.payoutDetails.bankAccount.ifscCode,
              bankName: seller.payoutDetails.bankAccount.bankName,
            }
          : undefined,
      notes: `Auto-payout — ${orders.length} delivered order(s) past ${AUTO_PAYOUT_WINDOW_DAYS}-day window`,
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
};
