import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

/**
 * Payouts Seed Data — LetItRip Collectibles Platform
 * 7 payouts covering all status states (pending, processing, completed, failed).
 * Store IDs from stores-seed-data.ts; order IDs from orders-seed-data.ts.
 */

import type { PayoutDocument } from "../features/payments/schemas";
import {
  PAYOUT_FIELDS,
  DEFAULT_PLATFORM_FEE_RATE,
} from "../features/payments/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const payoutsSeedData: Partial<PayoutDocument>[] = [
  // -- Pokémon Palace — Completed payout ─────────────────────────────────────
  {
    id: "payout-pokemon-palace-jan-2026-completed",
    storeId: "store-pokemon-palace",
    sellerName: "Pokémon Palace",
    sellerEmail: "aryan.kapoor@letitrip.in",
    amount: 427405,
    grossAmount: 449900,
    platformFee: 22495,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Aryan Kapoor",
      accountNumberMasked: "****3724",
      ifscCode: "HDFC0001122",
      bankName: "HDFC Bank",
    },
    notes: "January 2026 payout — Pokémon SV ETB order delivered",
    adminNote: "Bank transfer successful. Ref: TXN-2026-01-4521",
    orderIds: ["order-rahul-001-pokemon-etb"],
    requestedAt: daysAgo(25),
    processedAt: daysAgo(23),
    createdAt: daysAgo(25),
    updatedAt: daysAgo(23),
  },

  // -- LetItRip Official — Completed payout ──────────────────────────────────
  {
    id: "payout-letitrip-official-jan-2026-completed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    amount: 618435,
    grossAmount: 649900,
    platformFee: 31465,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "January 2026 payout — Nendoroid Rem + S.H.Figuarts Goku orders",
    adminNote: "UPI credited. Ref: UPI-2026-01-9983",
    orderIds: ["order-priya-002-nendoroid-rem", "order-priya-010-shf-goku"],
    requestedAt: daysAgo(20),
    processedAt: daysAgo(18),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(18),
  },

  // -- Beyblade Arena — Processing payout ────────────────────────────────────
  {
    id: "payout-beyblade-arena-feb-2026-processing",
    storeId: "store-beyblade-arena",
    sellerName: "Beyblade Arena",
    sellerEmail: "rohit.joshi@letitrip.in",
    amount: 379810,
    grossAmount: 399800,
    platformFee: 19990,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Rohit Joshi",
      accountNumberMasked: "****8815",
      ifscCode: "ICIC0002345",
      bankName: "ICICI Bank",
    },
    notes: "February 2026 payout — Beyblade X BX-01 x2 order",
    adminNote: "Bank transfer initiated. ETA 2 business days.",
    orderIds: ["order-meera-004-beyblade-bx01"],
    requestedAt: daysAgo(4),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  },

  // -- Diecast Depot — Pending payout ────────────────────────────────────────
  {
    id: "payout-diecast-depot-feb-2026-pending",
    storeId: "store-diecast-depot",
    sellerName: "Diecast Depot",
    sellerEmail: "vikram.mehta@letitrip.in",
    amount: 284905,
    grossAmount: 299900,
    platformFee: 14995,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "upi",
    upiId: "vikrammehta@paytm",
    notes: "February 2026 payout — Tomica Limited Datsun order (processing)",
    orderIds: ["order-rahul-005-tomica-datsun"],
    requestedAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // -- CardGame Hub — Pending payout ─────────────────────────────────────────
  {
    id: "payout-cardgame-hub-feb-2026-pending",
    storeId: "store-cardgame-hub",
    sellerName: "CardGame Hub",
    sellerEmail: "nisha.reddy@letitrip.in",
    amount: 284905,
    grossAmount: 299900,
    platformFee: 14995,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Nisha Reddy",
      accountNumberMasked: "****5509",
      ifscCode: "AXIS0003456",
      bankName: "Axis Bank",
    },
    notes: "February 2026 payout — Yu-Gi-Oh! 25th Anniversary Tin (pending payment)",
    orderIds: ["order-priya-006-yugioh-tin"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // -- LetItRip Official — Failed payout (bank rejected) ─────────────────────
  {
    id: "payout-letitrip-official-dec-2025-failed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    amount: 284905,
    grossAmount: 299900,
    platformFee: 14995,
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
    notes: "December 2025 payout — Gundam RX-78 MG order",
    adminNote: "Bank transfer rejected — IFSC code mismatch. Corrected IFSC on record.",
    orderIds: ["order-arjun-003-gundam-rx78"],
    requestedAt: daysAgo(38),
    processedAt: daysAgo(35),
    createdAt: daysAgo(38),
    updatedAt: daysAgo(35),
  },

  // -- Pokémon Palace — Pending payout (new batch) ────────────────────────────
  {
    id: "payout-pokemon-palace-feb-2026-pending",
    storeId: "store-pokemon-palace",
    sellerName: "Pokémon Palace",
    sellerEmail: "aryan.kapoor@letitrip.in",
    amount: 0,
    grossAmount: 0,
    platformFee: 0,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Aryan Kapoor",
      accountNumberMasked: "****3724",
      ifscCode: "HDFC0001122",
      bankName: "HDFC Bank",
    },
    notes: "February 2026 payout batch — pending admin review (no eligible orders yet)",
    orderIds: [],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
