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
