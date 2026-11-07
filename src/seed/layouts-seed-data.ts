/**
 * DEFAULT LAYOUTS — the arrangements, as seed data.
 *
 * Owner, 2026-11-08: *"the default layouts, composed widgets, arrangements and
 * all are also seed data."*
 *
 * A layout is an ordered list of placements: which widget, at what span, with
 * what display mode and overrides. Every surface that has a default arrangement
 * has a row here — dashboards per role, the PDP band order, the store page a
 * vendor clones, and the account pages.
 *
 * ## 🛑 The homepage is NOT re-declared here
 *
 * `homepage-sections-seed-data.ts` already owns the homepage arrangement (28
 * section types, ordering, enable flags, copy). Repeating it would be the
 * divergent second copy the project forbids. The join lives in
 * `widget-templates-seed-data.ts` → `legacySectionTypeToWidgetKey`.
 *
 * ## Clone-from-default
 *
 * `clonable: true` means a vendor or buyer gets their own copy to edit, and
 * required elements from the template merge back into that copy when the
 * platform updates it. Their own edits survive; a newly-required element
 * appears automatically.
 *
 * Mocks: `mocks/16-layouts.qm`, `mocks/02-dashboards.qm`, `mocks/13-vendor.qm`.
 */

import { widgetTemplatesByKey } from "./widget-templates-seed-data";

/** 12-column grid — the pack-by-span vocabulary that already exists. */
export type Span = 3 | 4 | 6 | 7 | 12;

export interface WidgetPlacement {
  /** Registry key from widget-templates-seed-data. */
  widget: string;
  span: Span;
  /** Display mode, when the template supports more than one. */
  mode?: string;
  /** Per-placement overrides: title, data-link scope, limits. */
  props?: Record<string, string | number | boolean>;
  /** Hidden but kept, so re-enabling restores its slot rather than appending. */
  enabled?: boolean;
}

export interface LayoutDefinition {
  key: string;
  label: string;
  /** What this layout is the default for. */
  surface: "dashboard" | "detail" | "store" | "account" | "listing" | "collection";
  /** Who owns an instance of it, and may therefore edit their copy. */
  ownedBy: "platform" | "seller" | "user";
  clonable: boolean;
  placements: WidgetPlacement[];
}

export const layoutsSeedData: LayoutDefinition[] = [
  // ── dashboards, one per role ──────────────────────────────────────────────
  {
    key: "dashboard.admin",
    label: "Admin dashboard",
    surface: "dashboard",
    ownedBy: "platform",
    clonable: true,
    placements: [
      { widget: "tile.stat", span: 3, props: { title: "GMV today", dataScope: "orders.gmv" } },
      { widget: "tile.chart", span: 6, mode: "bar", props: { title: "Orders by state" } },
      { widget: "tile.chart", span: 3, mode: "gauge", props: { title: "Payout health" } },
      { widget: "tile.listPreview", span: 6, props: { title: "Risk & fraud flags" } },
      { widget: "tile.listPreview", span: 3, props: { title: "Vendor approvals" } },
      { widget: "tile.toggle", span: 3, props: { title: "Content blocking" } },
      { widget: "tile.listPreview", span: 12, props: { title: "Audit log" } },
    ],
  },
  {
    key: "dashboard.seller",
    label: "Seller dashboard",
    surface: "dashboard",
    ownedBy: "seller",
    clonable: true,
    placements: [
      { widget: "tile.stat", span: 3, props: { title: "Sales today" } },
      { widget: "tile.stat", span: 4, props: { title: "Next payout" } },
      { widget: "tile.listPreview", span: 4, props: { title: "Open offers" } },
      { widget: "tile.toggle", span: 4, props: { title: "Offer mode" } },
      { widget: "tile.listPreview", span: 4, props: { title: "Low stock" } },
      { widget: "tile.cta", span: 4, props: { title: "Your store page" } },
      { widget: "tile.listPreview", span: 7, props: { title: "Orders to pack" } },
      { widget: "tile.navSlot", span: 4, props: { title: "Listing types you can use" } },
    ],
  },
  {
    key: "dashboard.buyer",
    label: "Buyer dashboard",
    surface: "dashboard",
    ownedBy: "user",
    clonable: true,
    placements: [
      { widget: "tile.stat", span: 3, props: { title: "Coins" } },
      { widget: "tile.listPreview", span: 6, props: { title: "Open orders" } },
      { widget: "tile.listPreview", span: 3, props: { title: "Offers you made" } },
      { widget: "tile.listPreview", span: 4, props: { title: "Clearance reveals" } },
      { widget: "tile.listPreview", span: 4, props: { title: "Pre-orders" } },
      { widget: "tile.cta", span: 4, props: { title: "Your public profile" } },
      { widget: "row.horizontalScroller", span: 12, props: { title: "Recently viewed" } },
    ],
  },
  {
    key: "dashboard.employee",
    label: "Employee dashboard",
    surface: "dashboard",
    ownedBy: "platform",
    clonable: true,
    placements: [
      { widget: "tile.navSlot", span: 4, props: { title: "Your roles" } },
      { widget: "tile.stat", span: 4, props: { title: "Queue" } },
      { widget: "tile.chart", span: 4, mode: "line", props: { title: "Handled today" } },
      { widget: "tile.listPreview", span: 7, props: { title: "Disputes" } },
      { widget: "tile.listPreview", span: 4, props: { title: "Moderation" } },
    ],
  },

  // ── the PDP band order ────────────────────────────────────────────────────
  {
    key: "detail.product",
    label: "Product detail",
    surface: "detail",
    ownedBy: "platform",
    clonable: true,
    placements: [
      { widget: "chrome.breadcrumb", span: 12 },
      { widget: "detail.product", span: 12 },
      { widget: "section.offerBook", span: 12, props: { requiresMechanism: "offers" } },
      { widget: "section.revealCountdown", span: 12, props: { requiresMechanism: "reveal" } },
      { widget: "section.richText", span: 12, props: { title: "Description" } },
      { widget: "section.specTable", span: 12, props: { requiresMechanism: "specTable" } },
      { widget: "section.policyBlock", span: 12 },
      { widget: "row.relatedItems", span: 12 },
      { widget: "row.sellerOtherItems", span: 12 },
      { widget: "grid.reviews", span: 12 },
      { widget: "section.faq", span: 12 },
    ],
  },

  // ── the store page a vendor clones ────────────────────────────────────────
  {
    key: "store.default",
    label: "Default storefront",
    surface: "store",
    ownedBy: "seller",
    clonable: true,
    placements: [
      { widget: "section.hero", span: 12, mode: "carousel" },
      { widget: "row.productCarousel", span: 12, mode: "tabbed", props: { title: "Our picks" } },
      { widget: "row.categoryShowcase", span: 12, mode: "stacked" },
      { widget: "section.richText", span: 6, props: { title: "About" } },
      { widget: "section.policyBlock", span: 6 },
      { widget: "grid.reviews", span: 12 },
      { widget: "section.faq", span: 12 },
    ],
  },

  // ── the buyer's public profile ────────────────────────────────────────────
  {
    key: "profile.default",
    label: "Default public profile",
    surface: "account",
    ownedBy: "user",
    clonable: true,
    placements: [
      { widget: "row.horizontalScroller", span: 6, props: { title: "My collection" } },
      { widget: "grid.reviews", span: 6, props: { title: "Recent reviews" } },
      { widget: "row.horizontalScroller", span: 4, props: { title: "Wishlist" } },
      { widget: "row.horizontalScroller", span: 4, props: { title: "Trading list" } },
      { widget: "section.trustCounters", span: 4, props: { title: "Badges" } },
    ],
  },

  // ── listing / collection surfaces ─────────────────────────────────────────
  {
    key: "listing.default",
    label: "Listing page",
    surface: "listing",
    ownedBy: "platform",
    clonable: true,
    placements: [
      { widget: "chrome.breadcrumb", span: 12 },
      { widget: "chrome.filterBar", span: 12 },
      { widget: "grid.products", span: 12, mode: "grid" },
    ],
  },
  {
    key: "collection.default",
    label: "Landing collection",
    surface: "collection",
    ownedBy: "platform",
    clonable: true,
    placements: [
      { widget: "chrome.breadcrumb", span: 12 },
      { widget: "section.richText", span: 12, props: { title: "Intro" } },
      { widget: "chrome.filterBar", span: 12 },
      { widget: "grid.products", span: 12, mode: "grid" },
      { widget: "section.faq", span: 12 },
    ],
  },
];

/** A placement pointing at a key that does not exist renders nothing — catch it here. */
for (const layout of layoutsSeedData) {
  for (const p of layout.placements) {
    if (!(p.widget in widgetTemplatesByKey)) {
      throw new Error(`layout "${layout.key}" places unknown widget "${p.widget}"`);
    }
  }
}

export const layoutsByKey: Readonly<Record<string, LayoutDefinition>> =
  Object.freeze(Object.fromEntries(layoutsSeedData.map(l => [l.key, l])));
