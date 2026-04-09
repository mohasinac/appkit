import { z } from "zod";

/**
 * Reason categories for loyalty coin transactions.
 */
export const coinReasonSchema = z.enum([
  "order_reward",
  "referral",
  "review_reward",
  "manual_credit",
  "manual_debit",
  "redemption",
  "expiry",
]);

export const coinHistoryEntrySchema = z.object({
  delta: z.number(),
  reason: coinReasonSchema,
  orderId: z.string().optional(),
  timestamp: z.string().optional(),
});

/**
 * Base Zod schema for a loyalty balance record.
 *
 * @example
 * import { loyaltyBalanceSchema } from "@mohasinac/feat-loyalty";
 *
 * const mySchema = loyaltyBalanceSchema.extend({
 *   tier: z.enum(["bronze", "silver", "gold"]),
 * });
 */
export const loyaltyBalanceSchema = z.object({
  uid: z.string(),
  hcCoins: z.number().default(0),
  coinHistory: z.array(coinHistoryEntrySchema).optional(),
});

export const loyaltyConfigSchema = z.object({
  coinsPerOrderUnit: z.number(),
  minRedeemableCoins: z.number(),
  maxRedemptionPercentPerOrder: z.number(),
  coinExpiryDays: z.number().optional(),
});
