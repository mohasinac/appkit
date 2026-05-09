/**
 * Coupon Usage Seed Data — LetItRip Collectibles Platform
 *
 * These records live at users/{userId}/couponUsage/{couponId}.
 * Each doc represents how many times a buyer has used a specific coupon,
 * which order IDs consumed it, and when it was last used.
 *
 * Used by the seed route to populate the subcollection so that the
 * per-user limit check (validateCouponForCart → getUserCouponUsageCount)
 * has realistic data to work against in the demo environment.
 */

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export interface CouponUsageSeedRecord {
  /** users/{userId} — the parent doc */
  userId: string;
  /** couponUsage/{couponId} — the subcollection doc ID */
  couponId: string;
  /** Denormalised human-readable code for display */
  couponCode: string;
  /** How many times this user has redeemed this coupon */
  usageCount: number;
  lastUsedAt: Date;
  /** All order IDs that consumed this coupon (most recent first) */
  orders: string[];
}

export const couponUsageSeedData: CouponUsageSeedRecord[] = [
  // ── aryan-kapoor used WELCOME10 once (perUserLimit: 1 → exhausted for him)
  {
    userId: "user-aryan-kapoor",
    couponId: "coupon-welcome10",
    couponCode: "WELCOME10",
    usageCount: 1,
    lastUsedAt: daysAgo(45),
    orders: ["order-2-20260325-a1b2c3"],
  },

  // ── priya-patel used POKEMON25 twice (perUserLimit: 3 → one more use left)
  {
    userId: "user-priya-patel",
    couponId: "coupon-pokemon25",
    couponCode: "POKEMON25",
    usageCount: 2,
    lastUsedAt: daysAgo(10),
    orders: ["order-1-20260420-d4e5f6", "order-3-20260430-g7h8i9"],
  },

  // ── arjun-singh used FREESHIP999 once (no perUserLimit)
  {
    userId: "user-arjun-singh",
    couponId: "coupon-freeship999",
    couponCode: "FREESHIP999",
    usageCount: 1,
    lastUsedAt: daysAgo(20),
    orders: ["order-1-20260410-j1k2l3"],
  },

  // ── meera-nair used BEYARENA20 once (perUserLimit: 1 → exhausted for her)
  {
    userId: "user-meera-nair",
    couponId: "coupon-beyarena20",
    couponCode: "BEYARENA20",
    usageCount: 1,
    lastUsedAt: daysAgo(8),
    orders: ["order-2-20260502-m4n5o6"],
  },

  // ── rahul-sharma used PALACE15 once (perUserLimit: 2 → one more use left)
  {
    userId: "user-rahul-sharma",
    couponId: "coupon-palace15",
    couponCode: "PALACE15",
    usageCount: 1,
    lastUsedAt: daysAgo(15),
    orders: ["order-1-20260425-p7q8r9"],
  },

  // ── vikram-mehta used TOKYOTOYS10 once (perUserLimit: 1 → exhausted for him)
  {
    userId: "user-vikram-mehta",
    couponId: "coupon-tokyotoys10",
    couponCode: "TOKYOTOYS10",
    usageCount: 1,
    lastUsedAt: daysAgo(3),
    orders: ["order-1-20260507-s1t2u3"],
  },
];
