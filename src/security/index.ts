export { generateNonce, buildCSP } from "./csp";
export {
  rateLimit,
  applyRateLimit,
  rateLimitByIdentifier,
  RateLimitPresets,
  clearRateLimitStore,
  getClientIP,
  hashGuestIdentity,
} from "./rate-limit";
export type { RateLimitConfig, RateLimitResult } from "./rate-limit";
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
export { redactPii, safeDisplayName, safeDisplayEmail, maskIp } from "./pii-redact";
export {
  encryptValue,
  decryptValue,
  hmacBlindIndex,
  encryptPiiFields,
  decryptPiiFields,
  encryptPii,
  decryptPii,
  piiBlindIndex,
  piiIndicesFor,
  getPiiConfigError,
  encryptPayoutDetails,
  decryptPayoutDetails,
  encryptShippingConfig,
  decryptShippingConfig,
  encryptPayoutBankAccount,
  decryptPayoutBankAccount,
} from "./pii-encrypt";
// Crypto-free display-masking helpers -- sourced from pii-mask.ts (not
// pii-encrypt.ts) so this barrel stays safe to re-export from the
// universal client+server index.ts. See pii-mask.ts's header comment.
export {
  isPiiEncrypted,
  maskName,
  maskEmail,
  maskPublicReview,
  maskPublicBid,
  maskPublicEventEntry,
  maskOfferForSeller,
  ENC_PREFIX,
  HMAC_PREFIX,
} from "./pii-mask";
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
  LOTTERY_ENTRY_PII_FIELDS,
  PAYMENT_METHOD_PII_FIELDS,
} from "./pii-schemas";
export {
  encryptSecret,
  decryptSecret,
  isSecretEncrypted,
  maskSecret,
} from "./settings-encryption";

// RBAC system — DELETED 2026-08-29.
//
// `security/rbac/**` was a complete second permission system: DEFAULT_ROLES,
// resolvePermissions, createRbacHook, createRequirePermission(Sync),
// createRbacMiddleware, <Can>, and its own `Permission` type. It had ZERO
// consumers outside its own directory and these barrels, and it looked alive on
// a grep only because its permission strings coincidentally overlapped the real
// union (a hazard action-defs.ts:129 already warned about).
//
// It was worse than inert. `appkit/src/index.ts` re-exported ITS `Permission`
// and ITS `hasPermission` — so a consumer importing either from the package
// root silently got the dead 6-role model instead of the live 130-member union
// and its helpers. Root Cause #53's exact shape, one module over.
//
// The live system is `features/auth/permissions/constants.ts` (the union,
// PERMISSION_GROUPS, hasPermission/hasAny/hasAll) plus
// `_internal/server/features/auth/permissions.ts` (getServerPermissions,
// checkPermission). Import from there.
