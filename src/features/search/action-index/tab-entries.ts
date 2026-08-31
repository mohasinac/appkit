/*
 * WHY: W8's C2 folded six sibling pages into tabs on five hosts. Each absorbed
 *      page kept its path as a redirect shell, but its NAV ENTRY was deleted —
 *      which is what removed it from the action index, since every nav-derived
 *      entry exists only because its nav item does.
 *
 *      Left there, "payout methods", "print centre" and "permissions catalogue"
 *      would each stop being findable in the command palette on the day they
 *      became easier to reach. `deepLink` is a field separate from `href`
 *      precisely for this case.
 *
 * WHAT: One entry per absorbed surface, deep-linked to its tab.
 *
 * ## 🛑 Why these are authored rather than derived
 *
 * Every other entry in this index is derived, and that is the rule the whole
 * file set exists to keep. These cannot be: the thing they name no longer has
 * a nav item, a route of its own, or any other list to fall out of. The tab
 * arrays are the closest thing, and their labels are written for a strip of
 * four characters' width ("Methods", "Queue", "Slug") rather than for someone
 * searching — which is the same reason the settings entries are authored too.
 *
 * The `href` still points at a real page and the tab id is still validated
 * against that page's own union, so neither half can rot silently.
 *
 * EXPORTS: deriveConsolidatedTabEntries, CONSOLIDATED_TAB_SURFACES
 *
 * @tag domain:search
 * @tag layer:constants
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:src/constants/action-index.ts
 * @tag sideEffects:none
 */

import type { ActionIndexEntry } from "./types";

export interface ConsolidatedTabSurface {
  /** Stable id suffix — `admin:tab:<slug>`. */
  slug: string;
  label: string;
  description: string;
  keywords: string[];
  /** The host page's route key, resolved by the caller. */
  route: "storePayouts" | "storeShipping" | "storeFulfillment" | "storeStorefront" | "adminRoles" | "adminSettings";
  tab: string;
  portal: "admin" | "store";
  sectionPath: string;
  requiredPermission?: string;
}

export const CONSOLIDATED_TAB_SURFACES: readonly ConsolidatedTabSurface[] = [
  {
    slug: "payout-methods",
    label: "Payout methods",
    description: "Where your money goes — bank account or UPI.",
    keywords: ["bank account", "upi", "payment details", "where do i get paid"],
    route: "storePayouts",
    tab: "methods",
    portal: "store",
    sectionPath: "Seller › Finance › Payouts",
  },
  {
    slug: "payout-settings",
    label: "Payout settings",
    description: "How often you get paid, and the minimum amount.",
    keywords: ["schedule", "frequency", "threshold", "minimum payout"],
    route: "storePayouts",
    tab: "settings",
    portal: "store",
    sectionPath: "Seller › Finance › Payouts",
  },
  {
    slug: "shipping-configs",
    label: "Named shipping configs",
    description: "Reusable shipping rules you can attach to a listing.",
    keywords: ["presets", "rules", "delivery", "rates"],
    route: "storeShipping",
    tab: "configs",
    portal: "store",
    sectionPath: "Seller › Store › Shipping",
  },
  {
    slug: "print-center",
    label: "Print centre",
    description: "Print labels, invoices and barcodes in a batch.",
    keywords: ["labels", "invoice", "barcode", "packing slip", "print"],
    route: "storeFulfillment",
    tab: "print",
    portal: "store",
    sectionPath: "Seller › Store › Fulfillment",
  },
  {
    slug: "store-slug",
    label: "Store web address",
    description: "The URL buyers reach your shop at.",
    keywords: ["url", "link", "domain", "slug", "change my address"],
    route: "storeStorefront",
    tab: "slug",
    portal: "store",
    sectionPath: "Seller › Store › Storefront",
  },
  {
    slug: "permissions-catalog",
    label: "Permissions catalogue",
    description: "Every permission string and what it unlocks.",
    keywords: ["rbac", "access", "capabilities", "what does this permission do"],
    route: "adminRoles",
    tab: "permissions",
    portal: "admin",
    sectionPath: "Admin › System › Custom Roles",
    requiredPermission: "roles:read",
  },
  {
    slug: "nav-permissions",
    label: "Navigation permissions",
    description: "Turn individual nav entries on or off across the portals.",
    keywords: ["menu access", "hide nav", "sidebar", "rbac"],
    route: "adminSettings",
    tab: "navigation",
    portal: "admin",
    sectionPath: "Admin › System › Permissions Toggles",
    requiredPermission: "settings:write",
  },
];

/** The host page each surface now lives on. */
export type ConsolidatedTabHrefs = Record<ConsolidatedTabSurface["route"], string>;

export function deriveConsolidatedTabEntries(hrefs: ConsolidatedTabHrefs): ActionIndexEntry[] {
  return CONSOLIDATED_TAB_SURFACES.map((surface) => ({
    id: `${surface.portal}:tab:${surface.slug}`,
    kind: "setting" as const,
    portal: surface.portal,
    label: surface.label,
    description: surface.description,
    keywords: surface.keywords,
    href: hrefs[surface.route],
    deepLink: `?tab=${surface.tab}`,
    sectionPath: surface.sectionPath,
    requiredPermission: surface.requiredPermission,
    /*
     * Same weight as a settings control, and for the same reason: someone
     * searching "upi" wants the payout-methods tab, not the Payouts page that
     * also matches on its own (now broader) keyword list.
     */
    weight: 20,
  }));
}
