import type { LoyaltyConfig } from "./index";

export function calculateCoinsEarned(orderTotal: number, config: LoyaltyConfig): number {
  if (!config.active || orderTotal <= 0) return 0;
  return Math.floor(orderTotal * config.coinsPerRupee);
}

export function calculateMaxRedeemable(
  userCoins: number,
  orderTotal: number,
  config: LoyaltyConfig,
): number {
  if (!config.active || userCoins < config.minCoinsToRedeem || orderTotal <= 0) return 0;
  const maxDiscountRupees = Math.floor((orderTotal * config.maxRedeemPercent) / 100);
  const maxCoinsByPercent = Math.floor(maxDiscountRupees / config.rupeePerCoin);
  return Math.min(userCoins, maxCoinsByPercent);
}

export function coinsToRupees(coins: number, config: LoyaltyConfig): number {
  if (coins <= 0) return 0;
  return Math.floor(coins * config.rupeePerCoin);
}

/**
 * Calculate the INR discount for a given coin redemption.
 * Ensures the discount never exceeds the order total.
 */
export function applyCoinsToOrder(
  coinsToRedeem: number,
  orderTotal: number,
  config: LoyaltyConfig,
): number {
  if (!config.active || coinsToRedeem <= 0 || orderTotal <= 0) return 0;
  const discount = coinsToRupees(coinsToRedeem, config);
  return Math.min(discount, orderTotal);
}
