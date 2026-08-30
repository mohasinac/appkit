/*
 * WHY: "Searching 'maintenance' should land me on the maintenance toggle" —
 *      and `Search.tsx` has had a **complete** quick-links path the whole
 *      time. Both modes are built: the inline filter already matches
 *      `link.keywords` as well as the label, the overlay renders a labelled
 *      band, the keyboard index arithmetic accounts for it, and
 *      `constants/search.ts` even holds the band's label string.
 *
 *      `grep "quickLinks="` returns **zero**. The one real mount passes nine
 *      props and not that one. A finished feature with no input.
 *
 *      The reason nothing passed it is that there was nothing to pass: no
 *      single list of what a user can DO existed. Nav lived in three arrays,
 *      quick actions in a registry each page ignored, and settings nowhere at
 *      all.
 * WHAT: `ActionIndexEntry` — one shape for every navigable or actionable
 *       surface, and the type the search, the command palette and (D7) the
 *       admin control plane all read.
 *
 * ## Why `iconName` is a string
 *
 * The index is serialised — into a Firestore control document, through an API
 * route, into React Query's cache. A `LucideIcon` component reference survives
 * none of those. The renderer resolves the name; the index carries data.
 *
 * ## Why `href` and every permission field are CODE-owned
 *
 * D7 lets an admin rename, re-describe, retag, reorder and hide an entry —
 * that is content. It does not let them repoint a built-in entry's route or
 * relax its permission, because those are routing and access control. An
 * admin-authored entry supplies its own `href`, and that one is validated at
 * SAVE time (see the write route): an audit that runs on CI would let a bad
 * href reach the sidebar and 404 until the next run.
 *
 * EXPORTS: ActionIndexEntry, ActionIndexKind, ActionIndexControl,
 *          type ActionIndexOverride
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:Search,CommandPalette,action-index admin screen
 * @tag sideEffects:none
 */

import type { NavPortal } from "../../../_internal/shared/features/layout/types";

/**
 * What kind of thing an entry is.
 *
 * The distinction that matters is `nav`/`page` (somewhere you go) versus
 * `setting`/`toggle`/`action` (something you change or do) — a search for
 * "maintenance mode" wants the toggle, not the settings page it lives on, and
 * only the kind tells them apart.
 */
export type ActionIndexKind =
  | "nav"
  | "page"
  | "section"
  | "setting"
  | "toggle"
  | "action";

export interface ActionIndexEntry {
  /** `{portal}:{kind}:{slug}` — also the overlay's React key. */
  id: string;
  kind: ActionIndexKind;
  /** `public` for anything outside the three dashboards. */
  portal: NavPortal | "public";
  label: string;
  description?: string;
  keywords?: string[];
  href: string;
  /**
   * The `?tab=`/`#anchor` that reaches the exact control, when the href alone
   * only reaches the page it lives on. This is what makes a search for
   * "maintenance" land on the toggle rather than on Site Settings.
   */
  deepLink?: string;
  /** Breadcrumb for the result row — "Admin › System › Site Settings". */
  sectionPath?: string;
  requiredRole?: string;
  requiredPermission?: string;
  requiresTester?: boolean;
  /** A lucide icon NAME. See the header for why this is not a component. */
  iconName?: string;
  /** Higher sorts first among equal-scoring matches. Default 0. */
  weight?: number;
}

/** What an admin may change about a built-in entry. */
export interface ActionIndexOverride {
  enabled?: boolean;
  label?: string;
  description?: string;
  keywords?: string[];
  weight?: number;
  group?: string;
  order?: number;
}

/**
 * The stored control document, `actionIndex/global`.
 *
 * Deliberately NOT folded into `siteSettings`: that document is read publicly
 * and edge-cached, and this one is projected by role.
 */
export interface ActionIndexControl {
  entries: Record<string, ActionIndexOverride>;
  /** Admin-authored entries, appended after the static base. */
  custom: ActionIndexEntry[];
}

export const ACTION_INDEX_COLLECTION = "actionIndex" as const;
export const ACTION_INDEX_DOC_ID = "global" as const;

/**
 * Apply an admin's overrides to the static base.
 *
 * Order is load-bearing: override, then DROP disabled, then append `custom`.
 * Dropping last would let an admin disable an entry and have their own
 * replacement for it disappear too, since a custom entry may legitimately
 * reuse a built-in id to supersede it.
 */
export function mergeActionIndex(
  base: readonly ActionIndexEntry[],
  control: ActionIndexControl | undefined,
): ActionIndexEntry[] {
  if (!control) return [...base];
  const merged: ActionIndexEntry[] = [];
  for (const entry of base) {
    const override = control.entries?.[entry.id];
    if (override?.enabled === false) continue;
    merged.push(
      override
        ? {
            ...entry,
            ...(override.label !== undefined ? { label: override.label } : {}),
            ...(override.description !== undefined
              ? { description: override.description }
              : {}),
            ...(override.keywords !== undefined ? { keywords: override.keywords } : {}),
            ...(override.weight !== undefined ? { weight: override.weight } : {}),
          }
        : entry,
    );
  }
  return merged.concat(control.custom ?? []);
}

/**
 * Drop every entry the viewer may not reach.
 *
 * 🛑 Filtered SERVER-side, never in the browser. An entry the client is not
 * allowed to act on is an entry it must not receive: the label alone is a site
 * map of the admin panel, which is D8's whole point.
 */
export function projectActionIndexForViewer(
  entries: readonly ActionIndexEntry[],
  viewer: {
    role?: string;
    permissions?: readonly string[];
    isTester?: boolean;
    isAdmin?: boolean;
  },
): ActionIndexEntry[] {
  return entries.filter((entry) => {
    if (entry.requiresTester && !viewer.isTester && !viewer.isAdmin) return false;
    if (entry.requiredRole && entry.requiredRole !== viewer.role && !viewer.isAdmin) {
      return false;
    }
    /*
     * An admin bypasses permission checks by design — `isAdminUser` short-
     * circuits every one of them elsewhere, and an index that disagreed would
     * hide screens the admin can plainly open from the sidebar.
     */
    if (entry.requiredPermission && !viewer.isAdmin) {
      if (!viewer.permissions?.includes(entry.requiredPermission)) return false;
    }
    return true;
  });
}
