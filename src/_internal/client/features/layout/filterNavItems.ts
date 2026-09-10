type FilterableItem = { id?: string; requiredPermission?: string };

/**
 * Filters nav items by:
 * 1. siteSettings.navConfig[item.id].enabled (admin toggle)
 * 2. requiredPermission — item hidden when user lacks the permission
 *
 * Items without an `id` always pass through (legacy / unmanaged items).
 *
 * 🛑 A FULL ADMIN HOLDS EVERY PERMISSION IMPLICITLY — `permissions[]` REFINES
 * EMPLOYEES, IT DOES NOT DEFINE ADMINS.
 *
 * That is how the rest of the system already works: every admin route guard is
 * `roles: ROLES_ADMIN_ONLY`, and employees are the ones who carry explicit
 * grants (the seeded employees hold 5 and 24 permissions respectively, while
 * `user-admin-letitrip` holds NONE — matching its seed, so this is by design
 * rather than drift). There is no role→permission derivation anywhere in the
 * codebase for the nav to lean on.
 *
 * Without `isAdmin` here, an admin matched no `requiredPermission` and EVERY
 * admin nav item was filtered out: the Admin Panel sidebar rendered completely
 * empty, and searching it returned "No matches". Every admin page stayed
 * reachable by typing its URL, which is exactly what made it look cosmetic.
 *
 * This surfaced only recently because the check had never run: `filterNavItems`
 * opens with `if (!item.id) return true;` and no item carried an `id` until
 * ids were derived (see navigation.tsx). Turning a dormant check on without the
 * data to satisfy it is the same shape as seeding a ratchet from the wrong
 * measurement — Root Cause #84.
 */
export function filterNavItems<T extends FilterableItem>(
  items: T[],
  navConfig: Record<string, { enabled: boolean }> | undefined,
  userPermissions: string[] | undefined,
  isAdmin = false,
): T[] {
  return items.filter((item) => {
    if (!item.id) return true;
    // The admin toggle still applies to admins — disabling a nav entry is a
    // deliberate configuration choice, not a permission the admin outranks.
    if (!(navConfig?.[item.id]?.enabled ?? true)) return false;
    if (isAdmin) return true;
    if (item.requiredPermission && !userPermissions?.includes(item.requiredPermission)) return false;
    return true;
  });
}
