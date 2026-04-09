// appkit/src/seed/factories/coupon.factory.ts
let _seq = 1;

export type CouponDiscountType = "percent" | "fixed";

export interface SeedCouponDocument {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: Date;
  sellerId?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function makeCoupon(
  overrides: Partial<SeedCouponDocument> = {},
): SeedCouponDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `coupon-${n}`,
    code: overrides.code ?? `SAVE${n * 10}`,
    discountType: overrides.discountType ?? "percent",
    discountValue: overrides.discountValue ?? 10,
    usedCount: overrides.usedCount ?? 0,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

export function makeFullCoupon(
  overrides: Partial<SeedCouponDocument> = {},
): SeedCouponDocument {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);
  return makeCoupon({
    minOrderAmount: 500,
    maxUses: 100,
    expiresAt,
    sellerId: "seller-1",
    ...overrides,
  });
}

export const COUPON_FIXTURES = {
  percentOff: makeFullCoupon({
    id: "coupon-1",
    code: "WELCOME10",
    discountType: "percent",
    discountValue: 10,
  }),
  fixedOff: makeFullCoupon({
    id: "coupon-2",
    code: "FLAT100",
    discountType: "fixed",
    discountValue: 100,
    minOrderAmount: 999,
  }),
};
