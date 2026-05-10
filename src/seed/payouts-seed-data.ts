import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

/**
 * Payouts Seed Data — LetItRip Collectibles Platform
 * 25 payouts covering all 8 stores and all status states.
 * Distribution: COMPLETED×14, PENDING×6, PROCESSING×3, FAILED×2.
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

// Helper: compute paise amounts from gross (INR × 100)
// platformFee = grossAmount * 0.05, amount = grossAmount - platformFee
function payoutAmounts(grossINR: number) {
  const grossAmount = Math.round(grossINR * 100);
  const platformFee = Math.round(grossAmount * DEFAULT_PLATFORM_FEE_RATE);
  const amount = grossAmount - platformFee;
  return { grossAmount, platformFee, amount };
}

export const payoutsSeedData: Partial<PayoutDocument>[] = [
  // ── COMPLETED payouts (×14) ──────────────────────────────────────────────────

  // 1. Pokémon Palace — Jan 2026 — COMPLETED
  {
    id: "payout-pokemon-palace-jan-2026-completed",
    storeId: "store-pokemon-palace",
    sellerName: "Pokémon Palace",
    sellerEmail: "aryan.kapoor@letitrip.in",
    ...payoutAmounts(4499),
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
    notes: "January 2026 payout — Pokémon SV ETB + Charizard ex orders delivered",
    adminNote: "Bank transfer successful. Ref: TXN-2026-01-4521",
    orderIds: ["order-rahul-001-pokemon-etb"],
    requestedAt: daysAgo(95),
    processedAt: daysAgo(93),
    createdAt: daysAgo(95),
    updatedAt: daysAgo(93),
  },

  // 2. LetItRip Official — Jan 2026 — COMPLETED
  {
    id: "payout-letitrip-official-jan-2026-completed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(6499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "January 2026 payout — Nendoroid Rem + S.H.Figuarts Goku orders",
    adminNote: "UPI credited. Ref: UPI-2026-01-9983",
    orderIds: ["order-priya-002-nendoroid-rem", "order-priya-010-shf-goku"],
    requestedAt: daysAgo(90),
    processedAt: daysAgo(88),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(88),
  },

  // 3. Gundam Galaxy — Dec 2025 — COMPLETED
  {
    id: "payout-gundam-galaxy-dec-2025-completed",
    storeId: "store-gundam-galaxy",
    sellerName: "Gundam Galaxy",
    sellerEmail: "aditya.sharma@letitrip.in",
    ...payoutAmounts(11999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Aditya Sharma",
      accountNumberMasked: "****6612",
      ifscCode: "KOTAK0004789",
      bankName: "Kotak Mahindra Bank",
    },
    notes: "December 2025 payout — PG Unicorn Gundam + MG RX-78-2 Ver.3.0 kits",
    adminNote: "Bank transfer successful. Ref: TXN-2025-12-8874",
    orderIds: ["order-arjun-003-gundam-rx78"],
    requestedAt: daysAgo(130),
    processedAt: daysAgo(128),
    createdAt: daysAgo(130),
    updatedAt: daysAgo(128),
  },

  // 4. Diecast Depot — Dec 2025 — COMPLETED
  {
    id: "payout-diecast-depot-dec-2025-completed",
    storeId: "store-diecast-depot",
    sellerName: "Diecast Depot",
    sellerEmail: "vikram.mehta@letitrip.in",
    ...payoutAmounts(7999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "vikrammehta@paytm",
    notes: "December 2025 payout — Hot Wheels RLC Camaro + Tomica Limited Vintage set",
    adminNote: "UPI credited. Ref: UPI-2025-12-5501",
    orderIds: ["order-rahul-005-tomica-datsun"],
    requestedAt: daysAgo(125),
    processedAt: daysAgo(123),
    createdAt: daysAgo(125),
    updatedAt: daysAgo(123),
  },

  // 5. Beyblade Arena — Nov 2025 — COMPLETED
  {
    id: "payout-beyblade-arena-nov-2025-completed",
    storeId: "store-beyblade-arena",
    sellerName: "Beyblade Arena",
    sellerEmail: "rohit.joshi@letitrip.in",
    ...payoutAmounts(3999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Rohit Joshi",
      accountNumberMasked: "****8815",
      ifscCode: "ICIC0002345",
      bankName: "ICICI Bank",
    },
    notes: "November 2025 payout — Beyblade X BX-01 Dran Sword + BX-04 set",
    adminNote: "Bank transfer successful. Ref: TXN-2025-11-3312",
    orderIds: ["order-meera-004-beyblade-bx01"],
    requestedAt: daysAgo(165),
    processedAt: daysAgo(163),
    createdAt: daysAgo(165),
    updatedAt: daysAgo(163),
  },

  // 6. CardGame Hub — Nov 2025 — COMPLETED
  {
    id: "payout-cardgame-hub-nov-2025-completed",
    storeId: "store-cardgame-hub",
    sellerName: "CardGame Hub",
    sellerEmail: "nisha.reddy@letitrip.in",
    ...payoutAmounts(5499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "nishareddy@gpay",
    notes: "November 2025 payout — Yu-Gi-Oh! 25th Anniversary Tin + MTG Bloomburrow box",
    adminNote: "UPI credited. Ref: UPI-2025-11-7743",
    orderIds: ["order-priya-006-yugioh-tin"],
    requestedAt: daysAgo(160),
    processedAt: daysAgo(158),
    createdAt: daysAgo(160),
    updatedAt: daysAgo(158),
  },

  // 7. Tokyo Toys India — Nov 2025 — COMPLETED
  {
    id: "payout-tokyo-toys-india-nov-2025-completed",
    storeId: "store-tokyo-toys-india",
    sellerName: "Tokyo Toys India",
    sellerEmail: "kavya.iyer@letitrip.in",
    ...payoutAmounts(9499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Kavya Iyer",
      accountNumberMasked: "****2291",
      ifscCode: "YESB0005678",
      bankName: "Yes Bank",
    },
    notes: "November 2025 payout — Nendoroid Hatsune Miku V4X + figma Asuna sets",
    adminNote: "Bank transfer successful. Ref: TXN-2025-11-9901",
    orderIds: ["order-anita-007-nendoroid-miku"],
    requestedAt: daysAgo(155),
    processedAt: daysAgo(153),
    createdAt: daysAgo(155),
    updatedAt: daysAgo(153),
  },

  // 8. Vintage Vault — Oct 2025 — COMPLETED
  {
    id: "payout-vintage-vault-oct-2025-completed",
    storeId: "store-vintage-vault",
    sellerName: "Vintage Vault",
    sellerEmail: "sneha.patel@letitrip.in",
    ...payoutAmounts(14999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Sneha Patel",
      accountNumberMasked: "****4477",
      ifscCode: "SBIN0009876",
      bankName: "State Bank of India",
    },
    notes: "October 2025 payout — Pokémon Base Set PSA 9 Charizard + Blastoise auction settlement",
    adminNote: "Bank transfer successful. Ref: TXN-2025-10-1122",
    orderIds: ["order-ravi-008-charizard-psa9"],
    requestedAt: daysAgo(200),
    processedAt: daysAgo(198),
    createdAt: daysAgo(200),
    updatedAt: daysAgo(198),
  },

  // 9. Pokémon Palace — Oct 2025 — COMPLETED
  {
    id: "payout-pokemon-palace-oct-2025-completed",
    storeId: "store-pokemon-palace",
    sellerName: "Pokémon Palace",
    sellerEmail: "aryan.kapoor@letitrip.in",
    ...payoutAmounts(6799),
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
    notes: "October 2025 payout — Scarlet & Violet Obsidian Flames ETB × 3",
    adminNote: "Bank transfer successful. Ref: TXN-2025-10-6634",
    orderIds: ["order-kiran-009-sv-obsidian"],
    requestedAt: daysAgo(195),
    processedAt: daysAgo(193),
    createdAt: daysAgo(195),
    updatedAt: daysAgo(193),
  },

  // 10. Gundam Galaxy — Feb 2026 — COMPLETED
  {
    id: "payout-gundam-galaxy-feb-2026-completed",
    storeId: "store-gundam-galaxy",
    sellerName: "Gundam Galaxy",
    sellerEmail: "aditya.sharma@letitrip.in",
    ...payoutAmounts(8499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "adityasharma@phonepe",
    notes: "February 2026 payout — HG Sazabi + RG Nu Gundam AMURO FINAL BATTLE kit",
    adminNote: "UPI credited. Ref: UPI-2026-02-3341",
    orderIds: ["order-aarav-011-hg-sazabi"],
    requestedAt: daysAgo(60),
    processedAt: daysAgo(58),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(58),
  },

  // 11. LetItRip Official — Feb 2026 — COMPLETED
  {
    id: "payout-letitrip-official-feb-2026-completed",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(5299),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "February 2026 payout — Funko Pop! Naruto Shippuden set + One Piece figures",
    adminNote: "UPI credited. Ref: UPI-2026-02-7765",
    orderIds: ["order-sanya-012-funko-naruto"],
    requestedAt: daysAgo(55),
    processedAt: daysAgo(53),
    createdAt: daysAgo(55),
    updatedAt: daysAgo(53),
  },

  // 12. Tokyo Toys India — Mar 2026 — COMPLETED
  {
    id: "payout-tokyo-toys-india-mar-2026-completed",
    storeId: "store-tokyo-toys-india",
    sellerName: "Tokyo Toys India",
    sellerEmail: "kavya.iyer@letitrip.in",
    ...payoutAmounts(4299),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Kavya Iyer",
      accountNumberMasked: "****2291",
      ifscCode: "YESB0005678",
      bankName: "Yes Bank",
    },
    notes: "March 2026 payout — figma Demon Slayer Tanjiro + Nezuko set sold",
    adminNote: "Bank transfer successful. Ref: TXN-2026-03-2289",
    orderIds: ["order-dev-013-figma-tanjiro"],
    requestedAt: daysAgo(40),
    processedAt: daysAgo(38),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(38),
  },

  // 13. Vintage Vault — Mar 2026 — COMPLETED
  {
    id: "payout-vintage-vault-mar-2026-completed",
    storeId: "store-vintage-vault",
    sellerName: "Vintage Vault",
    sellerEmail: "sneha.patel@letitrip.in",
    ...payoutAmounts(12499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "upi",
    upiId: "snehapatel@gpay",
    notes: "March 2026 payout — 1st Ed Team Rocket Holo Rare lot + Fossil Set Lapras",
    adminNote: "UPI credited. Ref: UPI-2026-03-8812",
    orderIds: ["order-priya-014-team-rocket-holo"],
    requestedAt: daysAgo(35),
    processedAt: daysAgo(33),
    createdAt: daysAgo(35),
    updatedAt: daysAgo(33),
  },

  // 14. Diecast Depot — Mar 2026 — COMPLETED
  {
    id: "payout-diecast-depot-mar-2026-completed",
    storeId: "store-diecast-depot",
    sellerName: "Diecast Depot",
    sellerEmail: "vikram.mehta@letitrip.in",
    ...payoutAmounts(5799),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.COMPLETED,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Vikram Mehta",
      accountNumberMasked: "****9934",
      ifscCode: "PUNB0006789",
      bankName: "Punjab National Bank",
    },
    notes: "March 2026 payout — Hot Wheels Premium Car Culture Japan Historics 2 set",
    adminNote: "Bank transfer successful. Ref: TXN-2026-03-5590",
    orderIds: ["order-rahul-015-hw-japan-historics"],
    requestedAt: daysAgo(30),
    processedAt: daysAgo(28),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },

  // ── PROCESSING payouts (×3) ───────────────────────────────────────────────────

  // 15. Beyblade Arena — Apr 2026 — PROCESSING
  {
    id: "payout-beyblade-arena-apr-2026-processing",
    storeId: "store-beyblade-arena",
    sellerName: "Beyblade Arena",
    sellerEmail: "rohit.joshi@letitrip.in",
    ...payoutAmounts(3799),
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
    notes: "April 2026 payout — Beyblade X BX-01 × 2 + BX-09 Knight Shield orders",
    adminNote: "Bank transfer initiated. ETA 2 business days.",
    orderIds: ["order-meera-016-bx09-knight-shield"],
    requestedAt: daysAgo(4),
    processedAt: daysAgo(2),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  },

  // 16. CardGame Hub — Apr 2026 — PROCESSING
  {
    id: "payout-cardgame-hub-apr-2026-processing",
    storeId: "store-cardgame-hub",
    sellerName: "CardGame Hub",
    sellerEmail: "nisha.reddy@letitrip.in",
    ...payoutAmounts(4999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
    paymentMethod: "upi",
    upiId: "nishareddy@gpay",
    notes: "April 2026 payout — MTG Murders at Karlov Manor Collector Booster box",
    adminNote: "UPI transfer queued. Processing batch run.",
    orderIds: ["order-arjun-017-mtg-karlov-collector"],
    requestedAt: daysAgo(3),
    processedAt: daysAgo(1),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // 17. Gundam Galaxy — May 2026 — PROCESSING
  {
    id: "payout-gundam-galaxy-may-2026-processing",
    storeId: "store-gundam-galaxy",
    sellerName: "Gundam Galaxy",
    sellerEmail: "aditya.sharma@letitrip.in",
    ...payoutAmounts(7299),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Aditya Sharma",
      accountNumberMasked: "****6612",
      ifscCode: "KOTAK0004789",
      bankName: "Kotak Mahindra Bank",
    },
    notes: "May 2026 payout — MG Sinanju Ver.Ka + HG Aerial Rebuild order batch",
    adminNote: "Bank transfer initiated. Settlement expected within 24 hours.",
    orderIds: ["order-kiran-018-mg-sinanju-verka"],
    requestedAt: daysAgo(2),
    processedAt: daysAgo(1),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // ── PENDING payouts (×6) ──────────────────────────────────────────────────────

  // 18. Diecast Depot — May 2026 — PENDING
  {
    id: "payout-diecast-depot-may-2026-pending",
    storeId: "store-diecast-depot",
    sellerName: "Diecast Depot",
    sellerEmail: "vikram.mehta@letitrip.in",
    ...payoutAmounts(2999),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "upi",
    upiId: "vikrammehta@paytm",
    notes: "May 2026 payout — Tomica Limited Vintage datsun 240Z set delivered",
    orderIds: ["order-rahul-019-tomica-240z"],
    requestedAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // 19. CardGame Hub — May 2026 — PENDING
  {
    id: "payout-cardgame-hub-may-2026-pending",
    storeId: "store-cardgame-hub",
    sellerName: "CardGame Hub",
    sellerEmail: "nisha.reddy@letitrip.in",
    ...payoutAmounts(2849),
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
    notes: "May 2026 payout — Yu-Gi-Oh! 25th Anniversary Tin + Digimon BT-16 booster",
    orderIds: ["order-priya-020-yugioh-25th-tin"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // 20. Pokémon Palace — May 2026 — PENDING
  {
    id: "payout-pokemon-palace-may-2026-pending",
    storeId: "store-pokemon-palace",
    sellerName: "Pokémon Palace",
    sellerEmail: "aryan.kapoor@letitrip.in",
    ...payoutAmounts(5199),
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
    notes: "May 2026 payout — Pokémon 151 UPC + Temporal Forces ETB batch",
    orderIds: ["order-aarav-021-pokemon-151-upc"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // 21. Vintage Vault — May 2026 — PENDING
  {
    id: "payout-vintage-vault-may-2026-pending",
    storeId: "store-vintage-vault",
    sellerName: "Vintage Vault",
    sellerEmail: "sneha.patel@letitrip.in",
    ...payoutAmounts(9899),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "upi",
    upiId: "snehapatel@gpay",
    notes: "May 2026 payout — Jungle Set Scyther holo + Base Set Unlimited Blastoise lot",
    orderIds: ["order-sanya-022-jungle-scyther-holo"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // 22. Tokyo Toys India — May 2026 — PENDING
  {
    id: "payout-tokyo-toys-india-may-2026-pending",
    storeId: "store-tokyo-toys-india",
    sellerName: "Tokyo Toys India",
    sellerEmail: "kavya.iyer@letitrip.in",
    ...payoutAmounts(3599),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "bank_transfer",
    bankAccount: {
      accountHolderName: "Kavya Iyer",
      accountNumberMasked: "****2291",
      ifscCode: "YESB0005678",
      bankName: "Yes Bank",
    },
    notes: "May 2026 payout — Nendoroid Spy × Family Anya Forger Limited + figma Loid",
    orderIds: ["order-dev-023-nendo-anya-limited"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // 23. LetItRip Official — May 2026 — PENDING
  {
    id: "payout-letitrip-official-may-2026-pending",
    storeId: "store-letitrip-official",
    sellerName: "LetItRip Official",
    sellerEmail: "admin@letitrip.in",
    ...payoutAmounts(4799),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.PENDING,
    paymentMethod: "upi",
    upiId: "letitrip@upi",
    notes: "May 2026 payout — McFarlane DC Multiverse Batman + NECA Predator Classic figure",
    orderIds: ["order-anita-024-mcfarlane-batman"],
    requestedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // ── FAILED payouts (×2) ───────────────────────────────────────────────────────

  // 24. LetItRip Official — Dec 2025 — FAILED (bank rejected)
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
    notes: "December 2025 payout — Gundam RX-78 MG order settlement",
    adminNote: "Bank transfer rejected — IFSC code mismatch. Corrected IFSC on record. Resubmit required.",
    orderIds: ["order-arjun-003-gundam-rx78"],
    requestedAt: daysAgo(155),
    processedAt: daysAgo(153),
    createdAt: daysAgo(155),
    updatedAt: daysAgo(153),
  },

  // 25. Vintage Vault — Jan 2026 — FAILED (UPI limit exceeded)
  {
    id: "payout-vintage-vault-jan-2026-failed",
    storeId: "store-vintage-vault",
    sellerName: "Vintage Vault",
    sellerEmail: "sneha.patel@letitrip.in",
    ...payoutAmounts(14499),
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: _CURRENCY,
    status: PAYOUT_FIELDS.STATUS_VALUES.FAILED,
    paymentMethod: "upi",
    upiId: "snehapatel@gpay",
    notes: "January 2026 payout — PSA 10 Charizard Gold Star + Tropical Wind Trophy card lot",
    adminNote: "UPI transaction failed — daily limit of ₹1,00,000 exceeded. Switched to bank transfer for resubmission.",
    orderIds: ["order-ravi-025-gold-star-charizard"],
    requestedAt: daysAgo(110),
    processedAt: daysAgo(108),
    createdAt: daysAgo(110),
    updatedAt: daysAgo(108),
  },
];
