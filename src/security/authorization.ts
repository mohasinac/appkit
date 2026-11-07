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
import {
  isAccountDisabled,
  holdsAnyRole,
  holdsRole,
  rolesOf,
  type RoleCarrier,
} from "../features/auth/role-predicates";
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
  /*
   * 🛑 Reconciled from 4 to 3 — EQUAL to employee — because `moderator` is
   * collapsed into `employee` (A9, owner 2026-11-07: they are the same thing;
   * moderation becomes an employee permission). `rolesOf()` folds the name
   * away on read, so a normalised role set never contains it and this entry is
   * only reachable through a raw, un-normalised scalar.
   *
   * Leaving it at 4 would have meant a backfilled moderator — now spelled
   * `employee` — silently DROPPING a rank, so any `getRoleLevel` comparison
   * written against "moderator or above" would start refusing them. Ranking
   * them equal is what makes the fold a no-op for every hierarchy comparison
   * in the codebase.
   *
   * The member stays declared so `Record<UserRole, number>` is total while the
   * union still carries the deprecated name for un-backfilled documents.
   */
  moderator: 3,
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

/**
 * Require that the user HOLDS one of `roles`.
 *
 * 🛑 Intersects the user's full role SET with the required set (1.43). Was
 * `requiredRoles.includes(user.role)` against a single scalar, which refused a
 * seller who also held `employee` on a seller-gated route and vice versa — a
 * 403 on a route the account is entitled to, with nothing in the response
 * explaining why. 33 appkit call sites and 18 host call sites go through here.
 */
export function requireRole(
  user: Record<string, JsonValue> | null | undefined,
  roles: UserRole | UserRole[],
): void {
  if (!user) throw new AuthenticationError(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  if (!holdsAnyRole(user as RoleCarrier, requiredRoles)) {
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
  if (isAccountDisabled(user)) throw new AuthorizationError(ERROR_MESSAGES.AUTH.ACCOUNT_DISABLED);
}

/**
 * May this actor change a target user's roles?
 *
 * - admin: anyone's, to anything (admin sees and does everything).
 * - employee (which `moderator` folds into): only the user → seller
 *   onboarding step.
 *
 * 🛑 Takes a role CARRIER now, not a scalar, so an actor who holds
 * `employee` alongside `seller` is still recognised as staff. The signature
 * accepts a bare role string too, so the existing call sites keep compiling.
 */
export function canChangeRole(
  actor: RoleCarrier | UserRole,
  targetCurrentRole: UserRole,
  targetNewRole: UserRole,
): boolean {
  const carrier: RoleCarrier =
    typeof actor === "string" ? { role: actor } : actor;
  if (holdsRole(carrier, "admin")) return true;
  if (holdsRole(carrier, "employee")) {
    const [current] = rolesOf({ role: targetCurrentRole });
    const [next] = rolesOf({ role: targetNewRole });
    return current === "user" && next === "seller";
  }
  return false;
}

/**
 * Return the numeric hierarchy level for a role.
 *
 * ⚠ For a USER, call `maxRoleLevel(user)` from `features/auth/auth-helpers` —
 * it takes the highest rank across the held set. This function answers about
 * one role name, which is only the whole story for a single-role account.
 */
export function getRoleLevel(role: UserRole): number {
  const [canonical] = rolesOf({ role });
  return ROLE_HIERARCHY[canonical] ?? 0;
}
