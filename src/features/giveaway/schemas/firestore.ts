/**
 * GiveawayEntry Firestore Document Type & Constants
 */

import type { GiveawayEntryStatus } from "../types";
import type { Encrypted, Plaintext } from "../../../security/encrypted";

/*
 * 🛑 BOUNDARY OF THE GIVEAWAY RENAME, deliberately left as-is — the same call
 * made for the `auctions/` Storage prefix in `AdminMediaView.tsx`.
 *
 * The CONSTANT is renamed; the STRING is not. This value names a Firestore
 * collection that may already hold live documents, and a collection is not
 * renamed by editing a literal — the documents do not move. Changing it here
 * would silently point every read and write at a new, empty collection while
 * the real entries sat unreachable under the old name, which is worse than the
 * word we are trying to remove.
 *
 * Renaming it for real is a data migration: copy forward, dual-read, verify
 * counts, cut over, delete. Tracked in plan §A19q. Until then every identifier,
 * type, route, label and file name in this feature says "giveaway", and this
 * one string is the only place the old vocabulary survives — where no user,
 * regulator or reviewer ever sees it.
 */
export const GIVEAWAY_ENTRIES_COLLECTION = "lotteryEntries" as const;

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
export type GiveawayEntryPlain = Plaintext<GiveawayEntryDocument>;

export type GiveawayEntryDocument = {
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
   * `GiveawayEntryRepository` no longer decrypting in `mapDoc`. Branding a field
   * that is still decrypted on read asserts something false, and `decryptValue`
   * passes a non-`enc:v1:` string straight through — so the lie would silently
   * "work" and surface only on the rows that were genuinely encrypted.
   *
   * Readers call `giveawayEntryRepository.maskedEntry(doc)` (the UI default) or
   * `revealEntry(doc)` (opt-in, named, greppable).
   */
  userDisplayName?: Encrypted<string>;
  // FUTURE_FINANCIAL_DB: external_tx_id → giveaway_transactions.external_tx_id
  /** PII — ciphertext at rest; see `userDisplayName` */
  userEmail?: Encrypted<string>;
  /** PII — ciphertext at rest; required. See `userDisplayName` */
  // FUTURE_FINANCIAL_DB: external_tx_id → giveaway_transactions.external_tx_id
  userPhone: Encrypted<string>;
  /** User-provided external payment TX ID */
  transactionId: string;
  /** User-provided time of payment */
  paymentTime: Date;
  /** Slot/item number the user submitted for */
  purchasedItemNumber: number;
  /** Sequential per source (1, 2, 3…) — assigned atomically */
  userGiveawayNumber: number;
  /** Filled after draw — assigned slot number */
  assignedPrizeSlotNumber?: number;
  status: GiveawayEntryStatus;
  isFlagged: boolean;
  flagNote?: string;
  flaggedBy?: string;
  flaggedAt?: Date;
  submittedAt: Date;
  drawnAt?: Date;
}

export const GIVEAWAY_ENTRY_INDEXED_FIELDS = [
  "sourceType",
  "eventId",
  "productId",
  "userId",
  "status",
  "submittedAt",
  "userGiveawayNumber",
] as const;

/** Canonical field name constants for giveawayEntries collection — use instead of hardcoded strings. */
export const GIVEAWAY_ENTRY_FIELDS = {
  SOURCE_TYPE: "sourceType",
  EVENT_ID: "eventId",
  PRODUCT_ID: "productId",
  USER_ID: "userId",
  STATUS: "status",
  TRANSACTION_ID: "transactionId",
  SUBMITTED_AT: "submittedAt",
  USER_GIVEAWAY_NUMBER: "userGiveawayNumber",
  IS_FLAGGED: "isFlagged",
} as const;
