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
  ENC_PREFIX,
  HMAC_PREFIX,
} from "./pii-encrypt";

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
