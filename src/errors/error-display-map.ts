import { normalizeError } from "./normalize";
import { ERROR_CODES, BID_ERROR_CODES, OFFER_ERROR_CODES } from "./error-codes";
import { HTTP_ERROR_CODES } from "./error-mapping";

/**
 * Per-code display metadata.
 *  - `field`: when present + a FormShellContext is in scope, the client wrapper
 *    routes the error inline as a field error instead of a toast.
 *  - `messageKey`: a `next-intl` key under `errors.codes.*` resolved at render time.
 *    Falls back to `errors.codes.UNKNOWN`, and then to `GENERIC_USER_MESSAGE`.
 *
 * 🛑 The chain terminates in a CONSTANT. It used to end "…then to the raw
 * `Error.message` if absent", and that tail is what printed a Node require
 * stack into the bid modal. Resolve codes through `toUserMessage` below; never
 * re-add a raw-message fallback.
 */
export interface ErrorDisplayEntry {
  field?: string;
  messageKey: string;
}

const k = (code: string): string => `errors.codes.${code}`;

export const ERROR_DISPLAY_MAP: Record<string, ErrorDisplayEntry> = {
  // ---------- AuthN / sessions ----------
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: {
    field: "password",
    messageKey: k(ERROR_CODES.AUTH_INVALID_CREDENTIALS),
  },
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: {
    messageKey: k(ERROR_CODES.AUTH_TOKEN_EXPIRED),
  },
  [ERROR_CODES.AUTH_TOKEN_INVALID]: {
    messageKey: k(ERROR_CODES.AUTH_TOKEN_INVALID),
  },
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: {
    messageKey: k(ERROR_CODES.AUTH_SESSION_EXPIRED),
  },
  [ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED]: {
    messageKey: k(ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED),
  },

  // ---------- Validation ----------
  [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: {
    messageKey: k(ERROR_CODES.VALIDATION_REQUIRED_FIELD),
  },
  [ERROR_CODES.VALIDATION_INVALID_INPUT]: {
    messageKey: k(ERROR_CODES.VALIDATION_INVALID_INPUT),
  },
  [ERROR_CODES.VALIDATION_INVALID_EMAIL]: {
    field: "email",
    messageKey: k(ERROR_CODES.VALIDATION_INVALID_EMAIL),
  },
  [ERROR_CODES.VALIDATION_INVALID_PASSWORD]: {
    field: "password",
    messageKey: k(ERROR_CODES.VALIDATION_INVALID_PASSWORD),
  },
  [ERROR_CODES.VALIDATION_INVALID_PHONE]: {
    field: "phone",
    messageKey: k(ERROR_CODES.VALIDATION_INVALID_PHONE),
  },

  // ---------- User ----------
  [ERROR_CODES.USER_NOT_FOUND]: { messageKey: k(ERROR_CODES.USER_NOT_FOUND) },
  [ERROR_CODES.USER_ALREADY_EXISTS]: {
    field: "email",
    messageKey: k(ERROR_CODES.USER_ALREADY_EXISTS),
  },
  [ERROR_CODES.USER_NOT_AUTHENTICATED]: {
    messageKey: k(ERROR_CODES.USER_NOT_AUTHENTICATED),
  },
  [ERROR_CODES.USER_ACCOUNT_DISABLED]: {
    messageKey: k(ERROR_CODES.USER_ACCOUNT_DISABLED),
  },

  // ---------- Database ----------
  [ERROR_CODES.DB_OPERATION_FAILED]: {
    messageKey: k(ERROR_CODES.DB_OPERATION_FAILED),
  },
  [ERROR_CODES.DB_NOT_FOUND]: { messageKey: k(ERROR_CODES.DB_NOT_FOUND) },
  [ERROR_CODES.DB_DUPLICATE_ENTRY]: {
    messageKey: k(ERROR_CODES.DB_DUPLICATE_ENTRY),
  },

  // ---------- Email ----------
  [ERROR_CODES.EMAIL_SEND_FAILED]: {
    messageKey: k(ERROR_CODES.EMAIL_SEND_FAILED),
  },
  [ERROR_CODES.EMAIL_INVALID_TEMPLATE]: {
    messageKey: k(ERROR_CODES.EMAIL_INVALID_TEMPLATE),
  },
  [ERROR_CODES.EMAIL_RATE_LIMITED]: {
    messageKey: k(ERROR_CODES.EMAIL_RATE_LIMITED),
  },
  [ERROR_CODES.EMAIL_DELIVERY_FAILED]: {
    messageKey: k(ERROR_CODES.EMAIL_DELIVERY_FAILED),
  },

  // ---------- Password ----------
  [ERROR_CODES.PWD_RESET_TOKEN_EXPIRED]: {
    messageKey: k(ERROR_CODES.PWD_RESET_TOKEN_EXPIRED),
  },
  [ERROR_CODES.PWD_RESET_TOKEN_INVALID]: {
    messageKey: k(ERROR_CODES.PWD_RESET_TOKEN_INVALID),
  },
  [ERROR_CODES.PWD_TOO_WEAK]: {
    field: "password",
    messageKey: k(ERROR_CODES.PWD_TOO_WEAK),
  },
  [ERROR_CODES.PWD_HISTORY_REUSE]: {
    field: "password",
    messageKey: k(ERROR_CODES.PWD_HISTORY_REUSE),
  },
  [ERROR_CODES.PWD_SAME_AS_CURRENT]: {
    field: "password",
    messageKey: k(ERROR_CODES.PWD_SAME_AS_CURRENT),
  },

  // ---------- Authorization ----------
  [ERROR_CODES.AUTHZ_FORBIDDEN]: {
    messageKey: k(ERROR_CODES.AUTHZ_FORBIDDEN),
  },
  [ERROR_CODES.AUTHZ_INSUFFICIENT_ROLE]: {
    messageKey: k(ERROR_CODES.AUTHZ_INSUFFICIENT_ROLE),
  },

  // ---------- General ----------
  [ERROR_CODES.GEN_BAD_REQUEST]: {
    messageKey: k(ERROR_CODES.GEN_BAD_REQUEST),
  },
  [ERROR_CODES.GEN_NOT_FOUND]: { messageKey: k(ERROR_CODES.GEN_NOT_FOUND) },
  [ERROR_CODES.GEN_INTERNAL_ERROR]: {
    messageKey: k(ERROR_CODES.GEN_INTERNAL_ERROR),
  },
  [ERROR_CODES.GEN_SERVICE_UNAVAILABLE]: {
    messageKey: k(ERROR_CODES.GEN_SERVICE_UNAVAILABLE),
  },
  [ERROR_CODES.GEN_RATE_LIMITED]: {
    messageKey: k(ERROR_CODES.GEN_RATE_LIMITED),
  },
  [ERROR_CODES.GEN_UNKNOWN]: { messageKey: k(ERROR_CODES.GEN_UNKNOWN) },

  // ---------- Bids ----------
  [BID_ERROR_CODES.PRODUCT_NOT_FOUND]: {
    messageKey: k(BID_ERROR_CODES.PRODUCT_NOT_FOUND),
  },
  [BID_ERROR_CODES.NOT_AUCTION]: {
    messageKey: k(BID_ERROR_CODES.NOT_AUCTION),
  },
  [BID_ERROR_CODES.AUCTION_ENDED]: {
    messageKey: k(BID_ERROR_CODES.AUCTION_ENDED),
  },
  [BID_ERROR_CODES.TOO_LOW]: {
    field: "amount",
    messageKey: k(BID_ERROR_CODES.TOO_LOW),
  },
  [BID_ERROR_CODES.INCREMENT_VIOLATED]: {
    field: "amount",
    messageKey: k(BID_ERROR_CODES.INCREMENT_VIOLATED),
  },
  [BID_ERROR_CODES.SELF_BID]: { messageKey: k(BID_ERROR_CODES.SELF_BID) },
  [BID_ERROR_CODES.USER_BANNED]: {
    messageKey: k(BID_ERROR_CODES.USER_BANNED),
  },
  [BID_ERROR_CODES.BUY_NOW_UNAVAILABLE]: {
    messageKey: k(BID_ERROR_CODES.BUY_NOW_UNAVAILABLE),
  },
  [BID_ERROR_CODES.BUY_NOW_NO_PRICE]: {
    messageKey: k(BID_ERROR_CODES.BUY_NOW_NO_PRICE),
  },
  [BID_ERROR_CODES.BUYOUT_LAPSED]: {
    messageKey: k(BID_ERROR_CODES.BUYOUT_LAPSED),
  },
  [BID_ERROR_CODES.BUYOUT_OUTBID]: {
    messageKey: k(BID_ERROR_CODES.BUYOUT_OUTBID),
  },
  [BID_ERROR_CODES.AUCTION_ALREADY_SOLD]: {
    messageKey: k(BID_ERROR_CODES.AUCTION_ALREADY_SOLD),
  },
  [BID_ERROR_CODES.AUCTION_ENDED_BEFORE_CHECKOUT]: {
    messageKey: k(BID_ERROR_CODES.AUCTION_ENDED_BEFORE_CHECKOUT),
  },

  // ---------- Offers ----------
  [OFFER_ERROR_CODES.DISABLED]: { messageKey: k(OFFER_ERROR_CODES.DISABLED) },
  [OFFER_ERROR_CODES.PRICE_TOO_LOW]: {
    field: "amount",
    messageKey: k(OFFER_ERROR_CODES.PRICE_TOO_LOW),
  },
  [OFFER_ERROR_CODES.LIMIT_REACHED]: {
    messageKey: k(OFFER_ERROR_CODES.LIMIT_REACHED),
  },
  [OFFER_ERROR_CODES.ALREADY_ACTIVE]: {
    messageKey: k(OFFER_ERROR_CODES.ALREADY_ACTIVE),
  },
  [OFFER_ERROR_CODES.EXPIRED]: { messageKey: k(OFFER_ERROR_CODES.EXPIRED) },
  [OFFER_ERROR_CODES.CHECKOUT_EXPIRED]: {
    messageKey: k(OFFER_ERROR_CODES.CHECKOUT_EXPIRED),
  },
  [OFFER_ERROR_CODES.WRONG_STATE]: {
    messageKey: k(OFFER_ERROR_CODES.WRONG_STATE),
  },

  // ---------- HTTP / mapped wire codes (from error-mapping.ts) ----------
  [HTTP_ERROR_CODES.VALIDATION_FAILED]: {
    messageKey: k(HTTP_ERROR_CODES.VALIDATION_FAILED),
  },
  [HTTP_ERROR_CODES.UNAUTHENTICATED]: {
    messageKey: k(HTTP_ERROR_CODES.UNAUTHENTICATED),
  },
  [HTTP_ERROR_CODES.FORBIDDEN]: { messageKey: k(HTTP_ERROR_CODES.FORBIDDEN) },
  [HTTP_ERROR_CODES.PERMISSION_DENIED]: {
    messageKey: k(HTTP_ERROR_CODES.PERMISSION_DENIED),
  },
  [HTTP_ERROR_CODES.NOT_FOUND]: { messageKey: k(HTTP_ERROR_CODES.NOT_FOUND) },
  [HTTP_ERROR_CODES.ALREADY_EXISTS]: {
    messageKey: k(HTTP_ERROR_CODES.ALREADY_EXISTS),
  },
  [HTTP_ERROR_CODES.RATE_LIMITED]: {
    messageKey: k(HTTP_ERROR_CODES.RATE_LIMITED),
  },
  [HTTP_ERROR_CODES.PRECONDITION_FAILED]: {
    messageKey: k(HTTP_ERROR_CODES.PRECONDITION_FAILED),
  },
  [HTTP_ERROR_CODES.CONCURRENT_MODIFICATION]: {
    messageKey: k(HTTP_ERROR_CODES.CONCURRENT_MODIFICATION),
  },
  [HTTP_ERROR_CODES.INTERNAL]: { messageKey: k(HTTP_ERROR_CODES.INTERNAL) },
  [HTTP_ERROR_CODES.UNAVAILABLE]: {
    messageKey: k(HTTP_ERROR_CODES.UNAVAILABLE),
  },
  [HTTP_ERROR_CODES.UPSTREAM_UNAVAILABLE]: {
    messageKey: k(HTTP_ERROR_CODES.UPSTREAM_UNAVAILABLE),
  },
  [HTTP_ERROR_CODES.NETWORK_ERROR]: {
    messageKey: k(HTTP_ERROR_CODES.NETWORK_ERROR),
  },
  [HTTP_ERROR_CODES.REQUEST_TIMEOUT]: {
    messageKey: k(HTTP_ERROR_CODES.REQUEST_TIMEOUT),
  },
  [HTTP_ERROR_CODES.DEGRADED_READ]: {
    messageKey: k(HTTP_ERROR_CODES.DEGRADED_READ),
  },
  [HTTP_ERROR_CODES.PAYMENT_ROLLBACK_ATTEMPTED]: {
    messageKey: k(HTTP_ERROR_CODES.PAYMENT_ROLLBACK_ATTEMPTED),
  },
  [HTTP_ERROR_CODES.PAYMENT_ROLLBACK_FAILED]: {
    messageKey: k(HTTP_ERROR_CODES.PAYMENT_ROLLBACK_FAILED),
  },
  [HTTP_ERROR_CODES.VERIFICATION_EMAIL_FAILED]: {
    messageKey: k(HTTP_ERROR_CODES.VERIFICATION_EMAIL_FAILED),
  },
  [HTTP_ERROR_CODES.CONFIRMATION_EMAIL_FAILED]: {
    messageKey: k(HTTP_ERROR_CODES.CONFIRMATION_EMAIL_FAILED),
  },
  [HTTP_ERROR_CODES.CLIENT_BOUNDARY]: {
    messageKey: k(HTTP_ERROR_CODES.CLIENT_BOUNDARY),
  },
  [HTTP_ERROR_CODES.CLIENT_PROMISE_REJECTION]: {
    messageKey: k(HTTP_ERROR_CODES.CLIENT_PROMISE_REJECTION),
  },
  [HTTP_ERROR_CODES.CLIENT_WINDOW_ERROR]: {
    messageKey: k(HTTP_ERROR_CODES.CLIENT_WINDOW_ERROR),
  },
  [HTTP_ERROR_CODES.CLIENT_UNHANDLED]: {
    messageKey: k(HTTP_ERROR_CODES.CLIENT_UNHANDLED),
  },
};

/** Look up display metadata; returns a generic entry when the code is unknown. */
export function getErrorDisplay(code: string): ErrorDisplayEntry {
  return ERROR_DISPLAY_MAP[code] ?? { messageKey: "errors.codes.UNKNOWN" };
}

/** Last-resort copy when no translator is available. Never a server string. */
export const GENERIC_USER_MESSAGE = "Something went wrong. Please try again.";

/**
 * The user-facing message for an error code. **Never returns server text.**
 *
 * 🛑 This is the whole point: every previous way of doing this ended in a raw
 * fallback. `ERROR_DISPLAY_MAP[code] ?? error` — the pattern CLAUDE.md Rule #9
 * §6 itself documented — falls through to the server's own message, and that
 * is how a Node `MODULE_NOT_FOUND`, complete with
 * `/var/task/.next/server/chunks/...` and its full require stack, was rendered
 * as copy inside the "Place your bid" modal. `surfaceError` had the same tail.
 * There was no shared helper that did this correctly, which is why ~60 call
 * sites each invented `err.message`.
 *
 * The chain is: code -> messageKey -> translation -> `errors.codes.UNKNOWN` ->
 * `GENERIC_USER_MESSAGE`. It terminates in a constant, deliberately.
 *
 * @param code    stable error code from an `ActionResult` / error envelope
 * @param t       a next-intl translator; omitted, the generic string is used
 * @param options `fallback` overrides the generic string with FEATURE-SPECIFIC
 *                copy you have authored ("Could not place your bid"). It must
 *                never be a value derived from an error object.
 */
export function toUserMessage(
  code: string | undefined,
  t?: (key: string) => string,
  options?: { fallback?: string },
): string {
  const generic = options?.fallback ?? GENERIC_USER_MESSAGE;
  if (!code) return generic;

  const { messageKey } = getErrorDisplay(code);
  if (!t) return generic;

  try {
    const translated = t(messageKey);
    // next-intl returns the key itself (or throws) when a message is missing;
    // either way that is not something to show a user.
    if (translated && translated !== messageKey) return translated;
    // next-intl throws MISSING_MESSAGE for an absent key. This function's whole
    // contract is to degrade to generic copy rather than let ANY internal
    // string — including an i18n internal — reach the user.
  } catch (translateErr) {
    void normalizeError(translateErr);
  }
  return generic;
}
