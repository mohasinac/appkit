// appkit/src/seed/factories/payout.factory.ts
let _seq = 1;

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export interface SeedPayoutDocument {
  id: string;
  sellerId: string;
  orderId: string;
  amount: number;
  status: PayoutStatus;
  platformFee?: number;
  commissionRate?: number;
  settledAt?: Date;
  /** PII — encrypted before Firestore write by seed runner */
  bankAccount?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function makePayout(
  overrides: Partial<SeedPayoutDocument> = {},
): SeedPayoutDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `payout-${n}`,
    sellerId: overrides.sellerId ?? "seller-1",
    orderId: overrides.orderId ?? `order-${n}`,
    amount: overrides.amount ?? 900,
    status: overrides.status ?? "pending",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

export function makeFullPayout(
  overrides: Partial<SeedPayoutDocument> = {},
): SeedPayoutDocument {
  const settledAt = new Date();
  settledAt.setDate(settledAt.getDate() - 2);
  return makePayout({
    platformFee: 100,
    commissionRate: 10,
    bankAccount: "ACC123456789",
    status: "paid",
    settledAt,
    ...overrides,
  });
}

export const PAYOUT_FIXTURES = {
  pending: makePayout({
    id: "payout-pending-1",
    orderId: "order-1",
  }),
  settled: makeFullPayout({
    id: "payout-settled-1",
    orderId: "order-2",
  }),
};
