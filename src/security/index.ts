export { generateNonce, buildCSP } from "./csp";
export {
  rateLimit,
  applyRateLimit,
  rateLimitByIdentifier,
  RateLimitPresets,
  clearRateLimitStore,
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
export { redactPii } from "./pii-redact";
export {
  encryptValue,
  decryptValue,
  hmacBlindIndex,
  encryptPiiFields,
  decryptPiiFields,
  encryptPii,
  decryptPii,
  isPiiEncrypted,
  piiBlindIndex,
  addPiiIndices,
  getPiiConfigError,
  encryptShippingAddress,
  decryptShippingAddress,
  encryptPayoutDetails,
  decryptPayoutDetails,
  encryptShippingConfig,
  decryptShippingConfig,
  encryptPayoutBankAccount,
  decryptPayoutBankAccount,
  maskName,
  maskEmail,
  maskPublicReview,
  maskPublicBid,
  maskPublicEventEntry,
  maskOfferForSeller,
  ENC_PREFIX,
  HMAC_PREFIX,
} from "./pii-encrypt";
export {
  USER_PII_FIELDS,
  USER_PII_INDEX_MAP,
  ADDRESS_PII_FIELDS,
  ORDER_PII_FIELDS,
  PAYOUT_PII_FIELDS,
  PAYOUT_PII_INDEX_MAP,
  BID_PII_FIELDS,
  NEWSLETTER_PII_FIELDS,
  NEWSLETTER_PII_INDEX_MAP,
  TOKEN_PII_FIELDS,
  TOKEN_PII_INDEX_MAP,
  REVIEW_PII_FIELDS,
  REVIEW_PII_INDEX_MAP,
  OFFER_PII_FIELDS,
  CHAT_PII_FIELDS,
  EVENT_ENTRY_PII_FIELDS,
} from "./pii-schemas";
export {
  encryptSecret,
  decryptSecret,
  isSecretEncrypted,
  maskSecret,
} from "./settings-encryption";

// RBAC system
export type {
  Permission,
  RoleDefinition,
  RbacConfig,
  ResolvedUser,
  RbacHookReturn,
} from "./rbac";
export {
  DEFAULT_ROLES,
  resolvePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  createRbacHook,
  Can,
  createRequirePermission,
  createRequirePermissionSync,
  createRbacMiddleware,
} from "./rbac";
