/*
 * WHY: W8's C2 folds sibling store pages that are one task into one tabbed
 *      page. Each absorbed page keeps a `?tab=` deep link so it stays findable
 *      from the command palette and from a bookmark, and the action index's
 *      `AIX_DEAD_DEEPLINK` check needs a union to validate those links
 *      against — a deep link naming a tab that does not exist opens the page
 *      on its default tab and reads as the search having missed.
 *
 * ## 🛑 Tab ids are NOT nav hrefs
 *
 * `navItemId(portal, href)` strips the query, so `/store/payouts` and
 * `/store/payouts?tab=methods` produce the SAME nav id — which is at once the
 * `navConfig` toggle key, the gate that makes `requiredPermission` run, and the
 * action-index entry id. So the absorbed pages keep their own hrefs (as
 * redirect shells) and these ids live only in `?tab=`.
 *
 * EXPORTS:
 *   PAYOUTS_TABS / isPayoutsTabId, SHIPPING_TABS / isShippingTabId,
 *   FULFILLMENT_TABS / isFulfillmentTabId, STOREFRONT_TABS / isStorefrontTabId
 *
 * @tag domain:seller
 * @tag layer:constants
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:store payouts/shipping/fulfillment/storefront pages,action index
 * @tag sideEffects:none
 */

/**
 * 🛑 `StoreDashboardTab`, not `StoreTab` — that name is already taken by
 * `features/stores`, which uses it for a tab on the PUBLIC store detail page.
 * Two same-named types in one package is the defect Root Cause #36 records, and
 * the barrel's choice between them would be invisible at every call site.
 */
export interface StoreDashboardTab {
  id: string;
  label: string;
  /** What lives in here, for anyone who does not know the tab's name. */
  description: string;
}

/** "Get paid": what I am owed, where it goes, on what schedule. */
export const PAYOUTS_TABS = [
  { id: "payouts", label: "Payouts", description: "What you have been paid, and what is still due." },
  { id: "methods", label: "Methods", description: "Where your money goes — bank or UPI." },
  { id: "settings", label: "Settings", description: "How often you get paid, and the minimum." },
] as const satisfies readonly StoreDashboardTab[];

export type PayoutsTabId = (typeof PAYOUTS_TABS)[number]["id"];

export function isPayoutsTabId(value: string | null | undefined): value is PayoutsTabId {
  return !!value && PAYOUTS_TABS.some((t) => t.id === value);
}

/** Shipping defaults, plus the reusable named presets built on top of them. */
export const SHIPPING_TABS = [
  { id: "rates", label: "Rates & zones", description: "What you charge to ship, and where you ship to." },
  { id: "configs", label: "Named configs", description: "Named shipping rules you can reuse per listing." },
] as const satisfies readonly StoreDashboardTab[];

export type ShippingTabId = (typeof SHIPPING_TABS)[number]["id"];

export function isShippingTabId(value: string | null | undefined): value is ShippingTabId {
  return !!value && SHIPPING_TABS.some((t) => t.id === value);
}

/** The pack-and-dispatch loop: the queue, then the paperwork it needs. */
export const FULFILLMENT_TABS = [
  { id: "queue", label: "Queue", description: "Orders waiting to be packed or handed over." },
  { id: "print", label: "Print centre", description: "Print labels, invoices and barcodes in a batch." },
] as const satisfies readonly StoreDashboardTab[];

export type FulfillmentTabId = (typeof FULFILLMENT_TABS)[number]["id"];

export function isFulfillmentTabId(value: string | null | undefined): value is FulfillmentTabId {
  return !!value && FULFILLMENT_TABS.some((t) => t.id === value);
}

/** The shop's identity — its look, and the address buyers reach it at. */
export const STOREFRONT_TABS = [
  { id: "profile", label: "Profile", description: "Your shop's name, logo, banner and description." },
  { id: "slug", label: "Web address", description: "The web address buyers reach your shop at." },
] as const satisfies readonly StoreDashboardTab[];

export type StorefrontTabId = (typeof STOREFRONT_TABS)[number]["id"];

export function isStorefrontTabId(value: string | null | undefined): value is StorefrontTabId {
  return !!value && STOREFRONT_TABS.some((t) => t.id === value);
}
