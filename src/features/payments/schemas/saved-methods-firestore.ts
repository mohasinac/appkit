/**
 * SavedPaymentMethod Firestore Document Types & Constants
 *
 * Stores user-saved payment identifiers (UPI VPAs, card tokens, bank accounts)
 * for checkout pre-fill and cross-account fraud detection.
 *
 * PII: `identifier` (full UPI VPA / card PAN) is encrypted at rest via
 * encryptPiiFields. `identifierHash` is a deterministic SHA-256 of the
 * normalised identifier and stored unencrypted for cross-account queries.
 * `displayLabel` is a pre-masked string and never contains full PII.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export type SavedPaymentMethodType = "upi" | "card" | "bank_account" | "wallet";

export type SavedPaymentMethodBanStatus = "banned" | "suspicious" | "unban_requested";

export interface SavedPaymentMethodDocument extends BaseDocument {
  userId: string;
  type: SavedPaymentMethodType;
  /** Full UPI VPA / card PAN / account number — ENCRYPTED at rest. */
  identifier: string;
  /** Pre-masked display string, never contains full PII. e.g. "9876...@paytm", "XXXX 4321 (HDFC)" */
  displayLabel: string;
  /** SHA-256(type|normalised(identifier)) — unencrypted; enables cross-account dedup without decrypting. */
  identifierHash: string;
  isDefault?: boolean;
  lastUsedAt?: Date;
  banStatus?: SavedPaymentMethodBanStatus;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: Date;
  autoBanned?: boolean;
  unbanRequestNote?: string;
  unbanRequestedAt?: Date;
}

export const SAVED_PAYMENT_METHODS_COLLECTION = "savedPaymentMethods" as const;

export const SAVED_PAYMENT_METHOD_INDEXED_FIELDS = [
  "userId",
  "identifierHash",
  "banStatus",
  "type",
  "createdAt",
] as const;

export const SAVED_PAYMENT_METHOD_PUBLIC_FIELDS = [
  "id",
  "userId",
  "type",
  "displayLabel",
  "identifierHash",
  "isDefault",
  "lastUsedAt",
  "banStatus",
  "banReason",
  "bannedAt",
  "unbanRequestNote",
  "unbanRequestedAt",
  "createdAt",
  "updatedAt",
] as const;

export const SAVED_PAYMENT_METHOD_UPDATABLE_FIELDS = [
  "displayLabel",
  "isDefault",
  "lastUsedAt",
  "unbanRequestNote",
  "unbanRequestedAt",
] as const;

export const SAVED_PAYMENT_METHOD_FIELDS = {
  USER_ID: "userId",
  TYPE: "type",
  IDENTIFIER: "identifier",
  DISPLAY_LABEL: "displayLabel",
  IDENTIFIER_HASH: "identifierHash",
  IS_DEFAULT: "isDefault",
  LAST_USED_AT: "lastUsedAt",
  BAN_STATUS: "banStatus",
  BAN_REASON: "banReason",
  BANNED_BY: "bannedBy",
  BANNED_AT: "bannedAt",
  AUTO_BANNED: "autoBanned",
  UNBAN_REQUEST_NOTE: "unbanRequestNote",
  UNBAN_REQUESTED_AT: "unbanRequestedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export type SavedPaymentMethodCreateInput = {
  type: SavedPaymentMethodType;
  /** Raw identifier — will be encrypted + hashed by repository. */
  identifier: string;
  displayLabel: string;
  isDefault?: boolean;
};

export type SavedPaymentMethodUpdateInput = Partial<
  Pick<SavedPaymentMethodDocument, (typeof SAVED_PAYMENT_METHOD_UPDATABLE_FIELDS)[number]>
>;
