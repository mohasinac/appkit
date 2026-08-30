/*
 * WHY: An index of "everything a user can do" is worth having exactly once and
 *      worth maintaining never. Hand-writing 260 entries beside the nav arrays
 *      they duplicate produces the drift this plan has spent every wave
 *      undoing — ten hand-written enumerations of one union (Root Cause #61),
 *      three option arrays that had each silently lost a value (W3c), fifteen
 *      postal rules (W5).
 * WHAT: Derive the static base FROM the nav groups and the quick-action
 *       registry, so an entry cannot exist without its nav item and cannot
 *       go stale when one is renamed.
 *
 * W6 is what makes this possible: every nav item now carries a `description`,
 * `keywords` and a derived `id`. Before that there was nothing to derive
 * from — which is the actual reason `Search.tsx`'s finished `quickLinks` path
 * was never wired to anything.
 *
 * EXPORTS: deriveNavEntries, deriveQuickActionEntries, buildActionIndexBase
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:action-index route,CommandPalette
 * @tag sideEffects:none
 */

import type { NavPortal, SidebarNavGroup } from "../../../_internal/shared/features/layout/types";
import type { ActionIndexEntry } from "./types";

/** A nav group set, with the portal it belongs to. */
export interface PortalNavGroups {
  portal: NavPortal;
  /** Human name for the breadcrumb — "Admin", "Seller", "Account". */
  portalLabel: string;
  groups: readonly SidebarNavGroup[];
}

/**
 * Every sidebar entry, as an index entry.
 *
 * `sectionPath` is the breadcrumb a result row shows — "Admin › System › Site
 * Settings" — and it is the reason the group title is worth carrying: two
 * portals both have "Orders", and without the path a result list shows the
 * same word twice with no way to tell which one you want.
 */
export function deriveNavEntries(sources: readonly PortalNavGroups[]): ActionIndexEntry[] {
  const entries: ActionIndexEntry[] = [];
  for (const { portal, portalLabel, groups } of sources) {
    for (const group of groups) {
      for (const item of group.items) {
        entries.push({
          /*
           * The nav item's own derived id, reused rather than re-derived. It
           * is already `nav-{portal}-{slug}`, so prefixing the kind keeps the
           * index's `{portal}:{kind}:{slug}` convention without inventing a
           * second identity for the same thing.
           */
          id: item.id ?? `${portal}:nav:${item.href}`,
          kind: "nav",
          portal,
          label: item.label,
          description: item.description,
          keywords: item.keywords,
          href: item.href,
          sectionPath: `${portalLabel} › ${group.title}`,
          ...(item.requiredPermission
            ? { requiredPermission: item.requiredPermission }
            : {}),
        });
      }
    }
  }
  return entries;
}

/** One quick action, as the registry stores it. */
export interface QuickActionSource {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  href?: string;
  routeKey?: string;
  iconKey?: string;
  requiredPermission?: string;
  requiredRole?: string;
  requiresAuth?: boolean;
}

/**
 * Quick actions, as index entries.
 *
 * 🛑 An action with no resolvable href is DROPPED, not indexed with a blank
 * one. `DASHBOARD_QUICK_ACTION_META`'s `routeKey` is dead — every page
 * re-declares its own `*_QUICK_ACTION_HREFS` map instead — so a registry entry
 * may genuinely have nowhere to go. Indexing it anyway produces a search
 * result that does nothing when clicked, which is worse than not finding it.
 */
export function deriveQuickActionEntries(
  actions: readonly QuickActionSource[],
  portal: NavPortal,
  portalLabel: string,
  hrefFor: (action: QuickActionSource) => string | undefined,
): ActionIndexEntry[] {
  const entries: ActionIndexEntry[] = [];
  for (const action of actions) {
    const href = action.href ?? hrefFor(action);
    if (!href) continue;
    entries.push({
      id: `${portal}:action:${action.id}`,
      kind: "action",
      portal,
      label: action.label,
      description: action.description,
      keywords: action.keywords,
      href,
      sectionPath: `${portalLabel} › Quick actions`,
      ...(action.iconKey ? { iconName: action.iconKey } : {}),
      ...(action.requiredPermission
        ? { requiredPermission: action.requiredPermission }
        : {}),
      ...(action.requiredRole ? { requiredRole: action.requiredRole } : {}),
      /*
       * A quick action is a shortcut to something already reachable from the
       * nav, so it ranks BELOW the nav entry for the same screen. Searching
       * "orders" should land on Orders, not on "Create an order".
       */
      weight: -10,
    });
  }
  return entries;
}

/**
 * Assemble the static base.
 *
 * Deduplicated by id, first writer winning, so a quick action that shares an
 * id with a nav entry does not produce two rows for one destination — and the
 * nav entry, being passed first, is the one that survives.
 */
export function buildActionIndexBase(
  ...groups: readonly ActionIndexEntry[][]
): ActionIndexEntry[] {
  const seen = new Set<string>();
  const out: ActionIndexEntry[] = [];
  for (const list of groups) {
    for (const entry of list) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    }
  }
  return out;
}
