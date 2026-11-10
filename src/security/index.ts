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
/*
 * The ciphertext-by-default forcing function. Types + two labelling helpers
 * only — no crypto — so this stays safe in the universal barrel (Root Cause
 * #24). See `encrypted.ts` for why `tsc` has to be the thing that enumerates
 * the 147 call sites, and why there is no `plaintext()` free function.
 */
export { asEncrypted, asEncryptedMaybe } from "./encrypted";
export type { Encrypted } from "./encrypted";
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
} from "./pii-encrypt";
/*
 * The two NAMED PII accessors that replace an unconditional `mapDoc` decrypt.
 * Server-only — they import `pii-encrypt`, which reaches node:crypto through a
 * bare runtime require (Root Cause #24), so this must never be re-exported
 * from the universal client entry.
 */
export { revealPii, maskPii, revealPiiAll, maskPiiAll } from "./pii-accessors";
// Crypto-free display-masking helpers -- sourced from pii-mask.ts (not
// pii-encrypt.ts) so this barrel stays safe to re-export from the
// universal client+server index.ts. See pii-mask.ts's header comment.
export {
  isPiiEncrypted,
  maskName,
  maskEmail,
  maskPhone,
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
  PRODUCT_PII_FIELDS,
  PAYOUT_PII_FIELDS,
  PAYOUT_PII_INDEX_MAP,
  BID_PII_FIELDS,
  TOKEN_PII_FIELDS,
  TOKEN_PII_INDEX_MAP,
  REVIEW_PII_FIELDS,
  REVIEW_PII_INDEX_MAP,
  OFFER_PII_FIELDS,
  EVENT_ENTRY_PII_FIELDS,
  GIVEAWAY_ENTRY_PII_FIELDS,
  PAYMENT_METHOD_PII_FIELDS,
  CONVERSATION_PII_FIELDS,
  MESSAGE_PII_FIELDS,
  /*
   * `STORE_PII_FIELDS` was missing from this barrel while every other list was
   * here — which is why `auth`'s PII CMS transcribed `["pan"]` by hand rather
   * than importing it. A list that cannot be imported gets copied.
   */
  STORE_PII_FIELDS,
} from "./pii-schemas";
/*
 * The ONE PII policy registry. Pure data — no crypto, no Firestore — so it is
 * safe in the universal barrel and readable by the seeder, the backfill tool
 * and the auth PII CMS alike. See its header for the five copies it replaces.
 */
export {
  PII_POLICIES,
  PII_POLICY_VERSION,
  PII_POLICY_CHANGELOG,
  piiPolicyFor,
  derivedIndexFieldsFor,
  allIndexFieldsFor,
  indexSourceFieldsFor,
  classifyIndexField,
  notFlatlyCheckable,
} from "./pii-registry";
export type {
  PiiCollectionPolicy,
  PiiTokensIndexSpec,
  PiiFieldSource,
  PiiIndexWriter,
} from "./pii-registry";
export {
  encryptSecret,
  decryptSecret,
  isSecretEncrypted,
  maskSecret,
  encryptBuffer,
  decryptBuffer,
  isBufferEncrypted,
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
