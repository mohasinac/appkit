/**
 * Collection-Specific PII Field Mappings
 *
 * Defines which fields in each Firestore collection contain PII that should be
 * encrypted before storage and decrypted on read.
 */

/** PII fields in the users collection (top-level string fields) */
export const USER_PII_FIELDS = ["email", "phoneNumber"] as const;

/** Blind-index mapping for queryable user PII: source → index field name */
export const USER_PII_INDEX_MAP: Record<string, string> = {
  email: "emailIndex",
  phoneNumber: "phoneIndex",
};

/** PII fields in the addresses subcollection */
export const ADDRESS_PII_FIELDS = [
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
] as const;

/** PII fields in orders (denormalized buyer/seller data) */
export const ORDER_PII_FIELDS = [
  "userName",
  "userEmail",
  "sellerEmail",
] as const;

/** PII fields in payouts */
export const PAYOUT_PII_FIELDS = ["sellerEmail", "upiId"] as const;

/** Blind-index mapping for queryable payout PII */
export const PAYOUT_PII_INDEX_MAP: Record<string, string> = {
  sellerEmail: "sellerEmailIndex",
};

/**
 * PII fields in bids.
 *
 * `userEmail` only. `userName` is deliberately NOT encrypted: the seller bid
 * search (`/api/store/bids`) does a prefix match on it, and encryption and
 * partial-match search are mutually exclusive over the same field — ciphertext
 * has no usable prefix. Encrypting it would silently break that search.
 * Bidder names are already masked on the public side by `maskPublicBid`.
 */
export const BID_PII_FIELDS = ["userEmail"] as const;

/** PII fields in newsletter subscribers */
export const NEWSLETTER_PII_FIELDS = [] as const;

/** Blind-index mapping for newsletter subscribers */
export const NEWSLETTER_PII_INDEX_MAP: Record<string, string> = {};

/**
 * PII fields in tokens (email verification / password reset).
 *
 * Was an empty array, so the encrypt/decrypt machinery wrapped around these
 * repositories was a no-op and every verification/reset email sat in cleartext.
 * Safe to enable because `findByEmail` already queries the blind index first
 * and falls back to plaintext equality, so legacy rows keep resolving while new
 * ones are encrypted.
 */
export const TOKEN_PII_FIELDS = ["email"] as const;

/** Blind-index mapping for token email queries */
export const TOKEN_PII_INDEX_MAP: Record<string, string> = {
  email: "emailIndex",
};

/** PII fields in reviews */
export const REVIEW_PII_FIELDS = ["userName"] as const;

/** Blind-index mapping for queryable review PII */
export const REVIEW_PII_INDEX_MAP: Record<string, string> = {
  userName: "userNameIndex",
};

/** PII fields in offers (buyer + seller data) */
export const OFFER_PII_FIELDS = [
  "buyerName",
  "buyerEmail",
  "sellerName",
] as const;

/** PII fields in chat rooms */
export const CHAT_PII_FIELDS = ["buyerName", "sellerName"] as const;

/** PII fields in event entries */
export const EVENT_ENTRY_PII_FIELDS = [
  "userDisplayName",
  "userEmail",
  "ipAddress",
] as const;

/** PII fields in lottery entries */
export const LOTTERY_ENTRY_PII_FIELDS = [
  "userPhone",
  "userEmail",
  "userDisplayName",
] as const;

/** Store OAuth bearer tokens — encrypted via SETTINGS_ENCRYPTION_KEY */
export const STORE_SECRET_FIELDS = ["whatsappConfig.accessToken"] as const;

/** PII fields in savedPaymentMethods — full identifier (UPI VPA, card PAN, etc.) */
export const PAYMENT_METHOD_PII_FIELDS = ["identifier"] as const;
