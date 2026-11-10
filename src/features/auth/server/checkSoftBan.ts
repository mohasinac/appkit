import type { UserDocument, UserSoftBan } from "../schemas/firestore";
import type { BannedAction } from "../permissions/constants";
import { isAdminUser, isEmployeeUser } from "../role-predicates";

/**
 * Returns true when the user has an active (non-expired) soft ban for the
 * given action. Admin and employee roles always bypass soft-ban checks.
 */
export function isSoftBanned(
  user: Pick<UserDocument, "role" | "softBans">,
  action: BannedAction,
): boolean {
  if (isAdminUser(user) || isEmployeeUser(user)) return false;
  if (!user.softBans || user.softBans.length === 0) return false;

  const now = new Date();
  return user.softBans.some((ban) => {
    if (ban.action !== action) return false;
    if (ban.expiresAt && new Date(ban.expiresAt) < now) return false;
    return true;
  });
}

/**
 * Is this user restricted from `action` on a SPECIFIC target?
 *
 * The parameterised sibling of `isSoftBanned`, for the actions that carry a
 * `target` — `{ action: "use_payment_method", target: "cod" }`. Used by the
 * payment-method resolver's buyer level and by the integrations deny-list,
 * which are the same shape by design.
 *
 * 🛑 A row with NO `target` denies EVERY target. That is the safe direction
 * for a malformed or half-written restriction: one that is too broad gets
 * reported by the affected buyer within minutes, whereas one that silently
 * applies to nothing leaves a risk control that looks applied and is not. The
 * field's own docstring records the same reasoning.
 *
 * ⚠ Inherits `isSoftBanned`'s staff bypass — admins and employees are never
 * soft-banned. Kept deliberately rather than special-cased here: the
 * convention is documented on that function, staff are not the population
 * these restrictions exist for, and two functions disagreeing about who
 * bypasses would be worse than the edge case it closes.
 */
export function isRestrictedTarget(
  user: Pick<UserDocument, "role" | "softBans">,
  action: BannedAction,
  target: string,
): boolean {
  if (isAdminUser(user) || isEmployeeUser(user)) return false;
  if (!user.softBans || user.softBans.length === 0) return false;

  const now = new Date();
  return user.softBans.some((ban) => {
    if (ban.action !== action) return false;
    if (ban.expiresAt && new Date(ban.expiresAt) < now) return false;
    // Unparameterised row ⇒ applies to all targets. See the 🛑 above.
    return ban.target === undefined || ban.target === target;
  });
}

/**
 * Splits a user's soft bans into active (non-expired) and expired buckets.
 * Useful for display in admin views and user settings.
 */
export function getBanSummary(
  user: Pick<UserDocument, "softBans">,
): { activeBans: UserSoftBan[]; expiredBans: UserSoftBan[] } {
  const now = new Date();
  const activeBans: UserSoftBan[] = [];
  const expiredBans: UserSoftBan[] = [];

  for (const ban of user.softBans ?? []) {
    if (ban.expiresAt && new Date(ban.expiresAt) < now) {
      expiredBans.push(ban);
    } else {
      activeBans.push(ban);
    }
  }

  return { activeBans, expiredBans };
}
