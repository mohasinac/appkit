export { generateNonce, buildCSP } from "./csp";

export {
  requireAuth,
  requireRole,
  requireOwnership,
  requireEmailVerified,
  requireActiveAccount,
  canChangeRole,
  getRoleLevel,
} from "./authorization";
export type { UserRole } from "./authorization";

export { redactPii } from "./pii-redact";

export {
  USER_PII_FIELDS,
  USER_PII_INDEX_MAP,
  ADDRESS_PII_FIELDS,
  ORDER_PII_FIELDS,
  PAYOUT_PII_FIELDS,
  PAYOUT_PII_INDEX_MAP,
  BID_PII_FIELDS,
  TOKEN_PII_FIELDS,
  TOKEN_PII_INDEX_MAP,
  REVIEW_PII_FIELDS,
  REVIEW_PII_INDEX_MAP,
  OFFER_PII_FIELDS,
  CHAT_PII_FIELDS,
  EVENT_ENTRY_PII_FIELDS,
} from "./pii-schemas";

// The `security/rbac/**` re-exports were deleted 2026-08-29 — see the note in
// ./index.ts. The live permission surface is
// `features/auth/permissions/constants.ts`; nothing client-side consumed the
// dead one.