/*
 * WHY: Seeds payouts for YGO marketplace — 2 stores, all status states.
 * WHAT: 10 payouts: COMPLETED (5), PROCESSING (1), PENDING (2 — one with refund deduction), FAILED (2).
 *
 * EXPORTS:
 *   payoutsSeedData — Array of Partial<PayoutDocument> for seed runner
 *
 * @tag domain:payouts,payments
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

import type { PayoutDocument, PayoutRefundDeduction } from "../features/payments/schemas";
import {
  PAYOUT_FIELDS,
  DEFAULT_PLATFORM_FEE_RATE,
} from "../features/payments/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function payoutAmounts(grossINR: number) {
  const grossAmount = Math.round(grossINR * 100);
  const platformFee = Math.round(grossAmount * DEFAULT_PLATFORM_FEE_RATE);
  const amount = grossAmount - platformFee;
  return { grossAmount, platformFee, amount };
}

function seedDeduction(
  orderId: string,
  refundId: string,
  refundedAmountInPaise: number,
  reason: string,
  daysAgoN: number,
): PayoutRefundDeduction {
  const deductedAmount = Math.round(refundedAmountInPaise * (1 - DEFAULT_PLATFORM_FEE_RATE));
  return { orderId, refundId, refundedAmount: refundedAmountInPaise, deductedAmount, reason, appliedAt: daysAgo(daysAgoN) };
}

export const payoutsSeedData: Partial<PayoutDocument>[] = [
  // ── COMPLETED (×5) ──────────────────────────────────────────────────────

  // 1. Kaiba Corp — Jan 2026
  {
    id: "payout-kaiba-corp-jan-2026-completed",
    storeId: "store-kaiba-corp-cards",
    sellerName: "Kaiba Corp Card Vault",
    sellerEmail: "seto.kaiba@letitrip.in",
    ...payoutAmounts(15000),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Seto Kaiba",
      accountNumberMasked: "****3724",
      ifscCode: "HDFC0001122",
      bankName: "HDFC Bank",
    },
    notes: "January 2026 payout — Blue-Eyes LOB singles + Dark Magician lot delivered",
    adminNote: "Bank transfer successful. Ref: TXN-2026-01-4521",
    orderIds: ["order-1-20260115-a1b2c3"],
    requestedAt: daysAgo(95),
    processedAt: daysAgo(93),
    createdAt: daysAgo(95),
    updatedAt: daysAgo(93),
  },

  // 2. LetItRip Official — Jan 2026
  {
    id: "payout-letitrip-official-jan-2026-completed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(8500),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "January 2026 payout — Exodia set + sealed LOB booster box orders",
    adminNote: "UPI credited. Ref: UPI-2026-01-9983",
    orderIds: ["order-2-20260120-d4e5f6"],
    requestedAt: daysAgo(90),
    processedAt: daysAgo(88),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(88),
  },

  // 3. Kaiba Corp — Mar 2026
  {
    id: "payout-kaiba-corp-mar-2026-completed",
    storeId: "store-kaiba-corp-cards",
    sellerName: "Kaiba Corp Card Vault",
    sellerEmail: "seto.kaiba@letitrip.in",
    ...payoutAmounts(22000),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Seto Kaiba",
      accountNumberMasked: "****3724",
      ifscCode: "HDFC0001122",
      bankName: "HDFC Bank",
    },
    notes: "March 2026 payout — PSA 10 Blue-Eyes auction settlement + Chaos Emperor Dragon",
    adminNote: "Bank transfer successful. Ref: TXN-2026-03-8874",
    orderIds: ["order-3-20260310-g7h8i9"],
    requestedAt: daysAgo(50),
    processedAt: daysAgo(48),
    createdAt: daysAgo(50),
    updatedAt: daysAgo(48),
  },

  // 4. LetItRip Official — Mar 2026
  {
    id: "payout-letitrip-official-mar-2026-completed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(5200),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "March 2026 payout — Structure deck + accessory orders",
    adminNote: "UPI credited. Ref: UPI-2026-03-7765",
    orderIds: ["order-4-20260315-j1k2l3"],
    requestedAt: daysAgo(40),
    processedAt: daysAgo(38),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(38),
  },

  // 5. Kaiba Corp — Apr 2026
  {
    id: "payout-kaiba-corp-apr-2026-completed",
    storeId: "store-kaiba-corp-cards",
    sellerName: "Kaiba Corp Card Vault",
    sellerEmail: "seto.kaiba@letitrip.in",
    ...payoutAmounts(9800),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "kaibacorp@upi",
    notes: "April 2026 payout — Mirror Force MRD lot + Pot of Greed singles batch",
    adminNote: "UPI credited. Ref: UPI-2026-04-3341",
    orderIds: ["order-5-20260420-m4n5o6"],
    requestedAt: daysAgo(20),
    processedAt: daysAgo(18),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(18),
  },

  // ── PROCESSING (×1) ─────────────────────────────────────────────────────

  // 6. LetItRip Official — May 2026
  {
    id: "payout-letitrip-official-may-2026-processing",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(4500),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "May 2026 payout — Starter Deck Yugi sealed + accessories batch",
    adminNote: "UPI transfer queued. Processing batch run.",
    orderIds: ["order-6-20260510-p7q8r9"],
    requestedAt: daysAgo(3),
    processedAt: daysAgo(1),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // ── PENDING (×2) ────────────────────────────────────────────────────────

  // 7. Kaiba Corp — May 2026 — with partial refund deduction
  {
    id: "payout-kaiba-corp-may-2026-pending",
    storeId: "store-kaiba-corp-cards",
    sellerName: "Kaiba Corp Card Vault",
    sellerEmail: "seto.kaiba@letitrip.in",
    ...payoutAmounts(12000),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Seto Kaiba",
      accountNumberMasked: "****3724",
      ifscCode: "HDFC0001122",
      bankName: "HDFC Bank",
    },
    notes: "May 2026 payout — Dark Magician Girl IOC + Raigeki LOB batch",
    orderIds: ["order-7-20260515-s1t2u3"],
    refundDeductions: [
      seedDeduction(
        "order-7-20260515-s1t2u3",
        "refund-order-7-partial-001",
        50000,
        "Card arrived with damaged top-loader — buyer requested partial refund",
        1,
      ),
    ],
    netAmount: payoutAmounts(12000).amount - 47500,
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // 8. LetItRip Official — May 2026
  {
    id: "payout-letitrip-official-may-2026-pending",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(3200),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "May 2026 payout — Pre-order deposits + deck box accessories",
    orderIds: ["order-8-20260518-v4w5x6"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // ── FAILED (×2) ─────────────────────────────────────────────────────────

  // 9. LetItRip Official — Dec 2025 — bank rejected
  {
    id: "payout-letitrip-official-dec-2025-failed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(2999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.FAILED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "LetItRip Admin",
      accountNumberMasked: "****1234",
      ifscCode: "SBIN0001234",
      bankName: "State Bank of India",
    },
    notes: "December 2025 payout — Sealed product order settlement",
    adminNote: "Bank transfer rejected — IFSC code mismatch. Corrected IFSC on record. Resubmit required.",
    orderIds: ["order-9-20251220-y7z8a9"],
    requestedAt: daysAgo(155),
    processedAt: daysAgo(153),
    createdAt: daysAgo(155),
    updatedAt: daysAgo(153),
  },

  // 10. Kaiba Corp — Jan 2026 — UPI limit exceeded
  {
    id: "payout-kaiba-corp-jan-2026-failed",
    storeId: "store-kaiba-corp-cards",
    sellerName: "Kaiba Corp Card Vault",
    sellerEmail: "seto.kaiba@letitrip.in",
    ...payoutAmounts(14499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.FAILED,
    paymentMethod: "upi",
    upiId: "kaibacorp@upi",
    notes: "January 2026 payout — PSA 10 Blue-Eyes Ultimate Dragon auction settlement",
    adminNote: "UPI transaction failed — daily limit of ₹1,00,000 exceeded. Switched to bank transfer for resubmission.",
    orderIds: ["order-10-20260125-b1c2d3"],
    requestedAt: daysAgo(110),
    processedAt: daysAgo(108),
    createdAt: daysAgo(110),
    updatedAt: daysAgo(108),
  },
];
