/**
 * LotteryEntry Firestore Document Type & Constants
 */

import type { LotteryEntryStatus } from "../types";
import type { Encrypted } from "../../../security/encrypted";

export const LOTTERY_ENTRIES_COLLECTION = "lotteryEntries" as const;

/**
 * The same entry with its PII as plain `string` — what the two named
 * repository accessors return.
 *
 * 🛑 Derived with a mapped type, never hand-written. A second literal listing
 * the same ~18 fields would drift the first time one was added to only one of
 * them, and the drift is invisible: both compile, and the one nobody updated
 * silently drops the new field from every reveal/mask call site.
 *
 * It is deliberately NOT distinguishable from a MASKED entry. `maskPii` also
 * returns plain strings, and a type cannot express "these characters are
 * asterisks" — the distinction lives in WHICH named method you called, which
 * is why they are two methods rather than one taking a boolean.
 */
export type LotteryEntryPlain = {
  [K in keyof LotteryEntryDocument]: LotteryEntryDocument[K] extends
    | Encrypted<string>
    | undefined
    ? Extract<LotteryEntryDocument[K], undefined> | string
    : LotteryEntryDocument[K];
};

export type LotteryEntryDocument = {
  id: string;
  sourceType: "event" | "product";
  /** Set when sourceType === "event" */
  eventId?: string;
  /** Set when sourceType === "product" */
  productId?: string;
  userId: string; // must be authenticated
  /**
   * PII — CIPHERTEXT as it sits here.
   *
   * 🛑 `Encrypted<string>` is a promise about the VALUE, kept by
   * `LotteryEntryRepository` no longer decrypting in `mapDoc`. Branding a field
   * that is still decrypted on read asserts something false, and `decryptValue`
   * passes a non-`enc:v1:` string straight through — so the lie would silently
   * "work" and surface only on the rows that were genuinely encrypted.
   *
   * Readers call `lotteryEntryRepository.maskedEntry(doc)` (the UI default) or
   * `revealEntry(doc)` (opt-in, named, greppable).
   */
  userDisplayName?: Encrypted<string>;
  // FUTURE_FINANCIAL_DB: external_tx_id → lottery_transactions.external_tx_id
  /** PII — ciphertext at rest; see `userDisplayName` */
  userEmail?: Encrypted<string>;
  /** PII — ciphertext at rest; required. See `userDisplayName` */
  // FUTURE_FINANCIAL_DB: external_tx_id → lottery_transactions.external_tx_id
  userPhone: Encrypted<string>;
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
