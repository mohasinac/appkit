/**
 * LotteryEntry Firestore Document Type & Constants
 */

import type { LotteryEntryStatus } from "../types";

export const LOTTERY_ENTRIES_COLLECTION = "lotteryEntries" as const;

export interface LotteryEntryDocument {
  id: string; // audit-schema-base-ok: uses submittedAt instead of updatedAt — cannot extend BaseDocument
  sourceType: "event" | "product";
  /** Set when sourceType === "event" */
  eventId?: string;
  /** Set when sourceType === "product" */
  productId?: string;
  userId: string; // must be authenticated
  userDisplayName?: string;
  // FUTURE_FINANCIAL_DB: external_tx_id → lottery_transactions.external_tx_id
  /** PII — encrypted at rest */
  userEmail?: string;
  /** PII — encrypted at rest; required */
  // FUTURE_FINANCIAL_DB: external_tx_id → lottery_transactions.external_tx_id
  userPhone: string;
  /** User-provided external payment TX ID */
  transactionId: string;
  /** User-provided time of payment */
  paymentTime: Date;
  /** Slot/item number the user submitted for */
  purchasedItemNumber: number;
  /** Sequential per source (1, 2, 3…) — assigned atomically */
  userLotteryNumber: number;
  /** Filled after draw — assigned slot number */
  assignedPrizeSlotNumber?: number;
  status: LotteryEntryStatus;
  isFlagged: boolean;
  flagNote?: string;
  flaggedBy?: string;
  flaggedAt?: Date;
  submittedAt: Date;
  drawnAt?: Date;
}

export const LOTTERY_ENTRY_INDEXED_FIELDS = [
  "sourceType",
  "eventId",
  "productId",
  "userId",
  "status",
  "submittedAt",
  "userLotteryNumber",
] as const;

/** Canonical field name constants for lotteryEntries collection — use instead of hardcoded strings. */
export const LOTTERY_ENTRY_FIELDS = {
  SOURCE_TYPE: "sourceType",
  EVENT_ID: "eventId",
  PRODUCT_ID: "productId",
  USER_ID: "userId",
  STATUS: "status",
  TRANSACTION_ID: "transactionId",
  SUBMITTED_AT: "submittedAt",
  USER_LOTTERY_NUMBER: "userLotteryNumber",
  IS_FLAGGED: "isFlagged",
} as const;
