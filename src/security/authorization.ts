/**
 * Authorization Guards
 *
 * Pure utility functions that throw AuthenticationError / AuthorizationError.
 * Suitable for API routes, Server Actions, and middleware.
 *
 * Note: getUserFromRequest / requireAuthFromRequest are intentionally omitted —
 * they depend on Firebase Admin and the user repository; implement them in your
 * app layer using these primitives.
 */

import { AuthenticationError, AuthorizationError } from "../errors";
import { ERROR_MESSAGES } from "../errors/messages";
import type { UserRole } from "../features/auth/types";
import type { JsonValue } from "../schemas/types";

export type { UserRole };

/**
 * 🛑 THE role hierarchy. There were two until 2026-08-29 — this one and a copy
 * in `features/auth/auth-helpers.ts` — and they DISAGREED: that copy ranked
 * `employee` and `moderator` equal (both 2), while this one puts moderator
 * above employee. So `hasRole(employeeUser, "moderator")` answered `true` or
 * `false` depending on which module the caller happened to import. Exported now
 * so there is one answer.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  moderator: 4,
  employee: 3,
  // Peers on purpose: a QA tester owns a real store and must clear every seller
  // gate. What a tester has BEYOND a seller is the `tester:admin-surfaces`
  // permission, not a higher rank — this chain is linear, so any level meaning
  // "seller plus admin read" would also outrank moderator and employee.
  seller: 2,
  tester: 2,
  user: 1,
};

export function requireAuth(user: unknown): void {
  if (!user) {
    throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  }
}

export function requireRole(
  user: Record<string, JsonValue> | null | undefined,
  roles: UserRole | UserRole[],
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  const userRole = (user.role as UserRole) || "user";
  if (!requiredRoles.includes(userRole)) {
    throw new AuthorizationError(ERROR_MESSAGES.AUTH.FORBIDDEN);
  }
}

export function requireOwnership(
  user: Record<string, JsonValue> | null | undefined,
  resourceOwnerId: string,
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  if (user.uid !== resourceOwnerId) {
    throw new AuthorizationError(ERROR_MESSAGES.AUTH.FORBIDDEN);
  }
}

export function requireEmailVerified(
  user: Record<string, JsonValue> | null | undefined,
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  if (!user.emailVerified) throw new AuthorizationError(ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED);
}

export function requireActiveAccount(
  user: Record<string, JsonValue> | null | undefined,
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  if (user.disabled) throw new AuthorizationError(ERROR_MESSAGES.AUTH.ACCOUNT_DISABLED);
}

/**
 * Check if currentUserRole is allowed to change a target user's role.
 * - admin:     can change anyone's role
 * - moderator: can only change user → seller
 */
export function canChangeRole(
  currentUserRole: UserRole,
  targetCurrentRole: UserRole,
  targetNewRole: UserRole,
): boolean {
  if (currentUserRole === "admin") return true;
  if (currentUserRole === "moderator") {
    return targetCurrentRole === "user" && targetNewRole === "seller";
  }
  return false;
}

/** Return the numeric hierarchy level for a role. */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}
