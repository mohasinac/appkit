"use client";

type FilterableItem = { id?: string; requiredPermission?: string };

/**
 * Filters nav items by:
 * 1. siteSettings.navConfig[item.id].enabled (admin toggle)
 * 2. requiredPermission — item hidden when user lacks the permission
 *
 * Items without an `id` always pass through (legacy / unmanaged items).
 */
export function filterNavItems<T extends FilterableItem>(
  items: T[],
  navConfig: Record<string, { enabled: boolean }> | undefined,
  userPermissions: string[] | undefined,
): T[] {
  return items.filter((item) => {
    if (!item.id) return true;
    if (!(navConfig?.[item.id]?.enabled ?? true)) return false;
    if (item.requiredPermission && !userPermissions?.includes(item.requiredPermission)) return false;
    return true;
  });
}
