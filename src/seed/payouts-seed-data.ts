import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

/**
 * Payouts Seed Data
 * Sample seller payout requests across all statuses
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
  // -- TechHub Electronics -----------------------------------------------

  // Completed payout — January batch (delivered Goku + Vegeta + Zoro + Bleach figures)
  {
    id: "payout-figurevault-jan-2026-completed",
    sellerId: "user-techhub-electronics-electron",
    sellerName: "FigureVault JP",
    sellerEmail: "techhub@letitrip.in",
    amount: 47879.55,
    grossAmount: 50399.0, // 12490 + 9990 + 18990 + 8990 Jan figure orders
    platformFee: 2519.45,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "FigureVault JP Pvt Ltd",
      accountNumberMasked: "****4892",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
    },
    notes:
      "January 2026 payout — Goku, Vegeta, Zoro, Bleach Ichigo figure orders",
    adminNote: "Verified and transferred. Ref: TXN-2026-01-3847",
    orderIds: [
      "order-1-20260115-xk7m9p",
      "order-1-20260120-b4n8q3",
      "order-1-20260128-t9u3v7",
      "order-1-20260128-s4t7u1",
    ],
    requestedAt: daysAgo(36),
    processedAt: daysAgo(32),
    createdAt: daysAgo(36),
    updatedAt: daysAgo(32),
  },

  // Processing payout — February batch
  {
    id: "payout-figurevault-feb-2026-processing",
    sellerId: "user-techhub-electronics-electron",
    sellerName: "FigureVault JP",
    sellerEmail: "techhub@letitrip.in",
    amount: 33718.55,
    grossAmount: 35493.0, // 24990 + 3499 + 6990 = 35,479
    platformFee: 1774.45,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "FigureVault JP Pvt Ltd",
      accountNumberMasked: "****4892",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
    },
    notes:
      "February 2026 payout — Luffy Gear 5, Totoro Nendoroid, Ultra Instinct Goku orders",
    adminNote: "Bank transfer initiated. ETA 2 business days.",
    orderIds: [
      "order-1-20260205-h2k6m4",
      "order-1-20260208-k2l4n8",
      "order-1-20260209-d6f2h1",
    ],
    requestedAt: daysAgo(22),
    createdAt: daysAgo(22),
    updatedAt: daysAgo(17),
  },

  // -- Fashion Boutique --------------------------------------------------

  // Completed payout — UPI
  {
    id: "payout-animecraft-jan-2026-completed",
    sellerId: "user-fashion-boutique-fashionb",
    sellerName: "AnimeCraft Apparel",
    sellerEmail: "fashion@letitrip.in",
    amount: 13491.0,
    grossAmount: 14201.0,
    platformFee: 710.05,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "fashionboutique@okaxis",
    notes:
      "January payout — Tanjiro T-shirt, Nezuko Hoodie, Cosplay Jacket orders",
    adminNote: "UPI transfer successful. Ref: UPI-2026-02-7721",
    orderIds: [
      "order-2-20260125-r5t9w1",
      "order-3-20260206-m3n7p5",
      "order-3-20260208-v1w7x2",
    ],
    requestedAt: daysAgo(35),
    processedAt: daysAgo(33),
    createdAt: daysAgo(35),
    updatedAt: daysAgo(33),
  },

  // Pending payout
  {
    id: "payout-animecraft-feb-2026-pending",
    sellerId: "user-fashion-boutique-fashionb",
    sellerName: "AnimeCraft Apparel",
    sellerEmail: "fashion@letitrip.in",
    amount: 18043.5,
    grossAmount: 18993.68,
    platformFee: 950.18,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "upi",
    upiId: "fashionboutique@okaxis",
    notes:
      "February 2026 payout batch — cosplay, apparel, cosplay jacket orders",
    orderIds: [
      "order-confirmed-2-20260216-fp7r1v",
      "order-confirmed-3-20260215-gx2s5u",
      "order-shipped-2-20260213-jq8v4a",
      "order-shipped-3-20260212-kt1w6b",
    ],
    requestedAt: daysAgo(12),
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },

  // -- Home Essentials ---------------------------------------------------

  // Failed payout (bank rejected)
  {
    id: "payout-otakushelf-jan-2026-failed",
    sellerId: "user-home-essentials-homeesse",
    sellerName: "OtakuShelf Co",
    sellerEmail: "home@letitrip.in",
    amount: 22800.0,
    grossAmount: 24000.0,
    platformFee: 1200.0,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.FAILED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "OtakuShelf Co",
      accountNumberMasked: "****7203",
      ifscCode: "SBIN0003456",
      bankName: "State Bank of India",
    },
    notes:
      "January 2026 payout — Nendoroid, 3D Maneuver Gear, Ghibli Shelf orders",
    adminNote:
      "Bank transfer rejected — IFSC code mismatch. Seller has been notified to update banking details.",
    orderIds: ["order-5-20260201-w8y2a6", "order-1-20260208-z1x5c9"],
    requestedAt: daysAgo(34),
    processedAt: daysAgo(30),
    createdAt: daysAgo(34),
    updatedAt: daysAgo(30),
  },

  // Pending payout — Home Essentials (re-requested after fixing bank details)
  {
    id: "payout-otakushelf-feb-2026-pending",
    sellerId: "user-home-essentials-homeesse",
    sellerName: "OtakuShelf Co",
    sellerEmail: "home@letitrip.in",
    amount: 22800.0,
    grossAmount: 24000.0,
    platformFee: 1200.0,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "OtakuShelf Co",
      accountNumberMasked: "****7203",
      ifscCode: "SBIN0004567",
      bankName: "State Bank of India",
    },
    notes: "Re-submitted with corrected IFSC code — Nendoroid + Ghibli orders",
    orderIds: ["order-5-20260201-w8y2a6", "order-1-20260208-z1x5c9"],
    requestedAt: daysAgo(15),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },

  // -- Home Essentials (was Sports Zone) -----------------------------------

  {
    id: "payout-otakushelf-jan2-2026-completed",
    sellerId: "user-home-essentials-homeesse",
    sellerName: "OtakuShelf Co",
    sellerEmail: "home@letitrip.in",
    amount: 11495.0,
    grossAmount: 12100.0,
    platformFee: 605.0,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "homeessentials@paytm",
    notes: "January payout for fitness + home orders",
    adminNote: "UPI credited. Ref: UPI-2026-02-8834",
    orderIds: [
      "order-confirmed-1-20260217-ck4t8w",
      "order-shipped-1-20260214-hn5u9z",
    ],
    requestedAt: daysAgo(32),
    processedAt: daysAgo(30),
    createdAt: daysAgo(32),
    updatedAt: daysAgo(30),
  },
];
