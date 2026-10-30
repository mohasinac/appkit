export const BID_ERROR_CODES = {
  PRODUCT_NOT_FOUND: "BID_PRODUCT_NOT_FOUND",
  NOT_COLLECTOR_DROP: "BID_NOT_COLLECTOR_DROP",
  COLLECTOR_DROP_ENDED: "BID_COLLECTOR_DROP_ENDED",
  TOO_LOW: "BID_AMOUNT_TOO_LOW",
  INCREMENT_VIOLATED: "BID_INCREMENT_TOO_LOW",
  SELF_BID: "BID_SELF_BID",
  USER_BANNED: "BID_USER_BANNED",
  /**
   * The buyout price is no longer better than the standing bid. Replaced
   * `BUY_NOW_BIDS_STARTED` (deleted 2026-08-24), which fired the instant anyone
   * bid at all — that eBay rule hid Buy Now on nearly every live collector drop.
   */
  BUY_NOW_UNAVAILABLE: "BID_BUY_NOW_UNAVAILABLE",
  BUY_NOW_NO_PRICE: "BID_BUY_NOW_NO_PRICE",
  /** The buyout hold expired (or was cancelled) before checkout completed. */
  BUYOUT_LAPSED: "BID_BUYOUT_LAPSED",
  /** Bidding passed the buyout price while the buyer was in checkout. */
  BUYOUT_OUTBID: "BID_BUYOUT_OUTBID",
  /** Another buyer's buyout claimed the collector drop first. */
  COLLECTOR_DROP_ALREADY_SOLD: "BID_COLLECTOR_DROP_ALREADY_SOLD",
  /** The collector drop's clock ran out mid-checkout, so it settled to a real bidder. */
  COLLECTOR_DROP_ENDED_BEFORE_CHECKOUT: "BID_COLLECTOR_DROP_ENDED_BEFORE_CHECKOUT",
} as const;

/**
 * Checkout refusals that are BUSINESS rules rather than malformed requests.
 *
 * 🛑 Registered here, not left as a bare string at the throw site. The code is
 * what `toUserMessage` resolves through `errors.codes.*`, and an unregistered
 * one terminates at `errors.codes.UNKNOWN` — so a buyer refused for a reason
 * the site can explain in one sentence would instead read "Something went
 * wrong. Please try again." and retry the same cart forever.
 * `audit-error-display-i18n` holds both ends: an enum value with no
 * `messages/en.json` key fails, and so does a key with no enum value.
 */
export const CHECKOUT_ERROR_CODES = {
  /** Cart total exceeds `siteSettings.payment.codMaxOrderValue`. */
  COD_LIMIT_EXCEEDED: "COD_LIMIT_EXCEEDED",
} as const;

export const OFFER_ERROR_CODES = {
  DISABLED: "OFFER_DISABLED",
  PRICE_TOO_LOW: "OFFER_PRICE_TOO_LOW",
  LIMIT_REACHED: "OFFER_LIMIT_REACHED",
  ALREADY_ACTIVE: "OFFER_ALREADY_ACTIVE",
  EXPIRED: "OFFER_EXPIRED",
  CHECKOUT_EXPIRED: "OFFER_CHECKOUT_EXPIRED",
  WRONG_STATE: "OFFER_WRONG_STATE",
} as const;

/**
 * Event prize-draw refusals — the spin wheel and the raffle draw.
 *
 * These exist because every refusal on those two surfaces used to render as the
 * single string "Spin failed. Please try again.": the client threw a native
 * `Error`, so `normalizeError` produced no code, so `toUserMessage` could only
 * return its fallback. A closed window, an exhausted per-user cap and a
 * misconfigured event were indistinguishable to the person spinning, and a
 * 401 never opened the login modal.
 *
 * Statuses live beside the reasons in
 * `_internal/server/jobs/core/event-draw-reasons.ts`; `audit-error-display-i18n`
 * requires a matching `errors.codes.*` key in `messages/en.json` for every
 * value below.
 */
export const EVENT_DRAW_ERROR_CODES = {
  IDENTITY_REQUIRED: "EVENT_IDENTITY_REQUIRED",
  LOGIN_REQUIRED: "EVENT_LOGIN_REQUIRED",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  EVENT_NOT_ACTIVE: "EVENT_NOT_ACTIVE",
  SPIN_NO_PRIZES: "SPIN_NO_PRIZES",
  SPIN_OUTSIDE_WINDOW: "SPIN_OUTSIDE_WINDOW",
  SPIN_ALREADY_USED: "SPIN_ALREADY_USED",
  NOT_A_SPIN_WHEEL: "EVENT_NOT_A_SPIN_WHEEL",
  RAFFLE_NOT_A_RAFFLE: "RAFFLE_NOT_A_RAFFLE",
  RAFFLE_ALREADY_DRAWN: "RAFFLE_ALREADY_DRAWN",
  RAFFLE_NO_ELIGIBLE_ENTRIES: "RAFFLE_NO_ELIGIBLE_ENTRIES",
  /** A reason the status map has never heard of — a bug in the core, mapped 500. */
  UNKNOWN_REASON: "EVENT_DRAW_UNKNOWN_REASON",
} as const;

export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: "AUTH_001",
  AUTH_TOKEN_EXPIRED: "AUTH_002",
  AUTH_TOKEN_INVALID: "AUTH_003",
  AUTH_SESSION_EXPIRED: "AUTH_004",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_005",

  // Validation
  VALIDATION_REQUIRED_FIELD: "VAL_001",
  VALIDATION_INVALID_INPUT: "VAL_002",
  VALIDATION_INVALID_EMAIL: "VAL_003",
  VALIDATION_INVALID_PASSWORD: "VAL_004",
  VALIDATION_INVALID_PHONE: "VAL_005",

  // User
  USER_NOT_FOUND: "USER_001",
  USER_ALREADY_EXISTS: "USER_002",
  USER_NOT_AUTHENTICATED: "USER_003",
  USER_ACCOUNT_DISABLED: "USER_004",

  // Database
  DB_OPERATION_FAILED: "DB_001",
  DB_NOT_FOUND: "DB_002",
  DB_DUPLICATE_ENTRY: "DB_003",

  // Email
  EMAIL_SEND_FAILED: "EMAIL_001",
  EMAIL_INVALID_TEMPLATE: "EMAIL_002",
  EMAIL_RATE_LIMITED: "EMAIL_003",
  EMAIL_DELIVERY_FAILED: "EMAIL_004",

  // Password
  PWD_RESET_TOKEN_EXPIRED: "PWD_001",
  PWD_RESET_TOKEN_INVALID: "PWD_002",
  PWD_TOO_WEAK: "PWD_003",
  PWD_HISTORY_REUSE: "PWD_004",
  PWD_SAME_AS_CURRENT: "PWD_005",

  // Authorization
  AUTHZ_FORBIDDEN: "AUTHZ_001",
  AUTHZ_INSUFFICIENT_ROLE: "AUTHZ_002",

  // General
  GEN_BAD_REQUEST: "GEN_001",
  GEN_NOT_FOUND: "GEN_002",
  GEN_INTERNAL_ERROR: "GEN_003",
  GEN_SERVICE_UNAVAILABLE: "GEN_004",
  GEN_RATE_LIMITED: "GEN_005",
  GEN_UNKNOWN: "GEN_999",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * ERROR_MESSAGES_BY_CODE - Flat mapping from error codes to locale-neutral technical messages.
 * For user-facing error messages with category/context, use ERROR_MESSAGES from @mohasinac/appkit/errors which exports from messages.ts.
 * @deprecated Prefer the categorized ERROR_MESSAGES from messages.ts instead.
 */
export const ERROR_MESSAGES_BY_CODE: Record<ErrorCode, string> = {
  // Authentication
  AUTH_001: "Invalid email or password",
  AUTH_002: "Your session has expired. Please log in again",
  AUTH_003: "Invalid authentication token",
  AUTH_004: "Your session has expired. Please log in again",
  AUTH_005: "Please verify your email address before logging in",

  // Validation
  VAL_001: "This field is required",
  VAL_002: "Invalid input provided",
  VAL_003: "Please enter a valid email address",
  VAL_004:
    "Password must be at least 12 characters with uppercase, lowercase, number and special character",
  VAL_005: "Please enter a valid phone number",

  // User
  USER_001: "User not found",
  USER_002: "An account with this email already exists",
  USER_003: "Please log in to continue",
  USER_004: "Your account has been disabled. Please contact support",

  // Database
  DB_001: "A database error occurred. Please try again",
  DB_002: "The requested resource was not found",
  DB_003: "This record already exists",

  // Email
  EMAIL_001: "Failed to send email. Please try again",
  EMAIL_002: "Invalid email template",
  EMAIL_003: "Too many emails sent. Please wait before trying again",
  EMAIL_004: "Email delivery failed. Please check the address and try again",

  // Password
  PWD_001: "Password reset link has expired. Please request a new one",
  PWD_002: "Invalid password reset link",
  PWD_003: "Password does not meet security requirements",
  PWD_004: "Cannot reuse a recent password",
  PWD_005: "New password must be different from your current password",

  // Authorization
  AUTHZ_001: "You do not have permission to perform this action",
  AUTHZ_002: "Insufficient role to perform this action",

  // General
  GEN_001: "Bad request",
  GEN_002: "The requested resource was not found",
  GEN_003: "An internal server error occurred",
  GEN_004: "Service temporarily unavailable",
  GEN_005: "Too many requests. Please slow down",
  GEN_999: "An unknown error occurred",
};
