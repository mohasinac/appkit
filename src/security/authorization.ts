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

export type UserRole = "admin" | "moderator" | "seller" | "user";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  moderator: 3,
  seller: 2,
  user: 1,
};

export function requireAuth(user: unknown): void {
  if (!user) {
    throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  }
}

export function requireRole(
  user: Record<string, unknown> | null | undefined,
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
  user: Record<string, unknown> | null | undefined,
  resourceOwnerId: string,
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  if (user.uid !== resourceOwnerId) {
    throw new AuthorizationError(ERROR_MESSAGES.AUTH.FORBIDDEN);
  }
}

export function requireEmailVerified(
  user: Record<string, unknown> | null | undefined,
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  if (!user.emailVerified) throw new AuthorizationError(ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED);
}

export function requireActiveAccount(
  user: Record<string, unknown> | null | undefined,
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
