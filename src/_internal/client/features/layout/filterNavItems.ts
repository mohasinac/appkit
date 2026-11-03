import type { SidebarNavGroup } from "../../../shared/features/layout/types";
import { sortByFieldOrder } from "../../../../features/shell/field-ui-meta";

type FilterableItem = { id?: string; requiredPermission?: string };

type NavConfigMap = Record<string, { enabled: boolean; order?: number }> | undefined;

/**
 * Derives a `sortByFieldOrder`-shaped `fieldOrder: string[]` from
 * `navConfig`'s own `order: number` entries — reorder, same as hide, reuses
 * the canonical 3B-1b hide/reorder primitive rather than a bespoke sort.
 *
 * `navConfig` stores a sparse per-item `order` (not a `fieldOrder: string[]`
 * array like `field-visibility.ts`) because it predates 3B-1b and is its
 * OWN, already-live, already-generic per-item override store — see the plan's
 * "🛑 THE CANONICAL PATTERN" section for why this subsystem deliberately
 * does not move its storage onto `field-visibility.ts`. Only the SORT LOGIC
 * is shared, not the storage shape.
 */
function navConfigFieldOrder(navConfig: NavConfigMap): string[] {
  if (!navConfig) return [];
  return Object.entries(navConfig)
    .filter((entry): entry is [string, { enabled: boolean; order: number }] => typeof entry[1].order === "number")
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id]) => id);
}

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
  navConfig: NavConfigMap,
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

/**
 * The GROUP-level filter — the sidebar's and the dashboard hubs' single answer
 * to "which sections and links may this viewer see".
 *
 * ## 🛑 `permissions === null` MEANS ADMIN, and that is why this is shared
 *
 * This lived as a module-private `filterGroups` inside
 * `DashboardLayoutClient.tsx` until the dashboard hubs needed the same answer.
 * Copying it would have been Root Cause #75's shape exactly — a rule whose own
 * comment says it is the convention, reachable only by copy-paste, where the
 * copy made today never learns about tomorrow's branch. And the branch it would
 * have lost is the expensive one: the `isAdmin && !navConfig` early return was
 * ONCE applied only when no navConfig existed, and the moment site settings
 * carried any nav config an admin's whole sidebar filtered to empty.
 *
 * A hub that disagreed with the sidebar would be worse than that, not better:
 * the sidebar is a list of links, while a hub card is a promise that the page
 * behind it will open. A card for a page that then 403s is a dead end the
 * viewer cannot distinguish from a broken permission.
 *
 * An empty group is dropped rather than rendered as a heading with nothing
 * under it — on a hub that is a section card claiming "0 screens", which reads
 * as a fault rather than as "not for you".
 *
 * REORDER (added 2026-11-04, 3B-1b backlog item 4) applies AFTER visibility
 * filtering, same "filter then sort" order every other `applyXVisibility`
 * wrapper in this codebase uses — an item hidden by `navConfig` never
 * occupies a position in the reordered list to begin with.
 */
export function filterNavGroups<T extends SidebarNavGroup>(
  groups: T[],
  navConfig: NavConfigMap,
  permissions: string[] | null | undefined,
): T[] {
  const isAdmin = permissions === null;
  if (isAdmin && !navConfig) return groups;
  const fieldOrder = navConfigFieldOrder(navConfig);
  return groups
    .map((group) => {
      const visible = filterNavItems(group.items, navConfig, permissions ?? undefined, isAdmin);
      return {
        ...group,
        items: fieldOrder.length > 0
          ? sortByFieldOrder(visible, fieldOrder, (item) => item.id ?? "")
          : visible,
      };
    })
    .filter((group) => group.items.length > 0) as T[];
}
