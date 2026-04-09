export interface LoyaltyConfig {
  coinsPerRupee: number;
  rupeePerCoin: number;
  minCoinsToRedeem: number;
  maxRedeemPercent: number;
  active: boolean;
}

export type CoinReason = "purchase" | "redemption" | "admin-grant" | "refund";

export interface CoinHistoryEntry {
  delta: number;
  reason: CoinReason;
  orderId?: string;
  timestamp: string;
}

export interface LoyaltyBalance {
  uid: string;
  hcCoins: number;
  coinHistory: CoinHistoryEntry[];
}

export interface EarnCoinsInput {
  uid: string;
  orderTotal: number;
  orderId: string;
  config: LoyaltyConfig;
}

export interface RedeemCoinsInput {
  uid: string;
  coinsToRedeem: number;
  orderId: string;
  config: LoyaltyConfig;
}

export interface RedeemCoinsResult {
  coinsRedeemed: number;
  discountAmount: number;
}

export { calculateCoinsEarned, calculateMaxRedeemable, coinsToRupees, applyCoinsToOrder } from "./loyalty-math";
