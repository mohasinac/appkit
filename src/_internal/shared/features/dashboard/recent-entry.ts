/**
 * RecentEntry — one dashboard-landing "recently used" card (Phase 9, overhaul
 * brief; extended to 7 kinds by Phase 10, "widget descriptors").
 *
 * ## Seven kinds, not one
 *
 * Phase 9 shipped PAGE, TOGGLE, and CHART — the owner's own extension beyond
 * "recently visited pages": *"if it is just 1 toggle then on the card itself
 * I can toggle it automatically without going into the depth"* and *"every
 * chart recently searched also becomes that... a preview of the original
 * charts."* Phase 10 ("everything on the website... becomes a widget")
 * extends the same mechanism to four more source types — SETTING_PREVIEW,
 * ADMIN_ROW, PRODUCT_CARD, PDP_SECTION — each at explicitly reduced fidelity,
 * because each source system (`DataListingView`, `ProductCard`,
 * `ProductDetailPageView`'s render-prop slots, the 20-tab site-settings form)
 * is too structurally different from the others to share a live-preview
 * shape without becoming either vacuous or a bag of escape hatches. See the
 * plan's Phase 10 section for the full per-surface reasoning; the summary:
 *
 * - `settingPreview` — READ-ONLY. Points at a site-settings toggle OUTSIDE
 *   the closed, write-capable `TOGGLE_CATALOG` registry. Never flips
 *   anything; navigates to the real settings tab and shows the current value
 *   as text. `SETTINGS_PREVIEW_IDS` and `TOGGLE_CATALOG_IDS` are disjoint by
 *   construction (enforced by `audit-widget-descriptor-sync.mjs` R3) — there
 *   is exactly one writable path into site settings from a dashboard card.
 * - `adminRow` — a bookmark to one `DataListingView` row, not a live mirror
 *   of its columns. No column/badge/status preview (would need a per-row
 *   read per resource on every dashboard paint); at most ONE action
 *   (`primaryActionId`, resolved through the `ACTIONS` registry per Rule #7),
 *   never the row's full action menu or bulk actions. Only resources whose
 *   view resolves a row to a real URL (`rowHrefTemplate`) are eligible — a
 *   view using only an in-page `renderEditor` drawer cannot be pinned.
 * - `productCard` — deliberately breaks the "no snapshot" rule below: `label`
 *   is the title captured at pin time, with NO live price/stock/wishlist/
 *   badges (a price-gate check + stock read per pinned product per dashboard
 *   render is the Rule #6 Firestore-budget concern this card type accepts
 *   paying the cost of going visually stale to avoid). No mini-actions;
 *   clicking navigates to the real PDP.
 * - `pdpSection` — the thinnest of the four. Renders identically to a `page`
 *   card (label + link) — reproducing a real preview would mean re-deriving
 *   the same page-scoped closures (GST disclosure, seller-identity
 *   visibility, offer bounds) outside the page itself. Not globally
 *   searchable (no cross-product index over section content); recorded only
 *   from an in-page "jump to section" nav on the PDP, never through the
 *   dashboard search box.
 *
 * `adminRow` and `productCard` are NEVER surfaced by the dashboard's own
 * search box (`rankNavSearchResults` ranks small, fully in-memory-loaded
 * arrays — fine for 3 toggles or a dozen charts, structurally wrong for
 * thousands of rows/products). They are created only through an explicit
 * "Pin to dashboard" action on the real surface, mirroring the reasoning
 * that already made `RecentVisitTracker.tsx` reject passive recording of
 * dynamic page visits.
 *
 * A discriminated union rather than one flat shape with optional fields,
 * because each kind has its own identity (`href` / `toggleId` / `chartId` /
 * `settingId` / `resource`+`rowId` / `productId`[+`sectionId`]) and its own
 * card renderer — an optional-everything shape would let a `page` entry
 * carry a `toggleId` with nothing to stop it.
 *
 * ## 🛑 No state/value snapshot, ever (`productCard` is the one named exception above)
 *
 * A toggle or chart entry records only that it was used, never its state or
 * value at that moment. A stale "was off" or a stale "was ₹3,548" is actively
 * misleading on a card whose entire point is to show the CURRENT number —
 * the card always reads the toggle's live on/off state or the chart's live
 * current value at render time, the same way `AdminCommandPaletteMount`'s
 * existing Listing Types toggles already fetch-on-mount rather than cache.
 *
 * Declared here (shared, type-only-safe) rather than hand-duplicated across
 * the Firestore schema and the client `useProfile.ts` types, because a
 * hand-copied discriminated union drifts far more easily than a copied
 * `Record<string, string[]>` — a missed variant member compiles silently on
 * whichever side was not updated.
 */
export type RecentEntry =
  | { kind: "page"; href: string; label: string; visitedAt: string }
  | { kind: "toggle"; toggleId: string; label: string; visitedAt: string }
  | { kind: "chart"; chartId: string; label: string; visitedAt: string }
  | { kind: "settingPreview"; settingId: string; label: string; visitedAt: string }
  | { kind: "adminRow"; resource: AdminRowResource; rowId: string; label: string; visitedAt: string }
  | { kind: "productCard"; productId: string; href: string; label: string; visitedAt: string }
  | { kind: "pdpSection"; productId: string; sectionId: PdpSectionId; label: string; visitedAt: string };

/**
 * Closed resource vocabulary for `adminRow` entries. Deliberately NOT a
 * hand-invented string union — reuses the same top-level bucket keys as
 * `ACTIONS` in `appkit/src/_internal/shared/actions/action-registry.ts`, so
 * "is this a real admin resource" has one answer across the CTA registry and
 * the widget-pin system. `audit-widget-descriptor-sync.mjs` R1 cross-checks
 * every `ADMIN_ROW_HREF_BY_RESOURCE` key against the real `ACTIONS` buckets.
 *
 * 🛑 This is NOT "every bucket in ACTIONS," and the gap is real, not an
 * oversight — verified 2026-11-02 by reading every `Admin*View.tsx`'s own
 * `ListingViewConfig`. The per-surface escape hatch named in the doc comment
 * above ("only resources whose view resolves a row to a real URL are
 * eligible") excludes most of the obvious candidates: `AdminProductsView`,
 * `AdminUsersView`, `AdminStoresView`, `AdminBrandsView`,
 * `AdminCategoriesView`, `AdminGroupedListingsView` and `AdminReviewsView`
 * all click through via `renderEditor` (an in-page drawer) or an `onRowClick`
 * that opens local state — neither is a URL a card can link to. These five
 * are the ones that DO declare a real `rowHrefTemplate`:
 */
export type AdminRowResource =
  | "BUNDLE"
  | "RANDOM_LOTS"
  | "BEY"
  | "PART"
  | "SUBLISTING";

/**
 * PDP render-prop slot identifiers, mirroring `ProductDetailPageView.tsx`'s
 * own `renderGallery`/`renderInfo`/`renderActions`/`renderTabs`/
 * `renderRelated` names 1:1 — not a second, independently-invented
 * vocabulary for the same five slots.
 */
export type PdpSectionId = "gallery" | "info" | "actions" | "tabs" | "related";

/** Per-user recently-visited/used cards, namespaced by `"{portal}:hub"` scope — same convention as `hiddenHubCards`. */
export type RecentlyVisitedMap = Record<string, RecentEntry[]>;

/** Hard cap enforced by both the client hook and the server merge route — "10 cards" is the owner's own number. */
export const RECENT_ENTRIES_MAX = 10;

/**
 * 🛑 Plain `Omit<T, K>` does NOT distribute over a union. `keyof RecentEntry`
 * collapses to the fields common to every variant (`kind` / `label` /
 * `visitedAt`) — so `Omit<RecentEntry, "visitedAt">` silently drops `href` /
 * `toggleId` / `chartId` entirely, and callers trying to build a `{kind:
 * "toggle", toggleId, label}` literal get "`toggleId` does not exist".
 * `T extends unknown ? ... : never` is a NAKED type parameter in a
 * conditional, which is what triggers TypeScript's distributive behaviour.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What a caller supplies to `recordVisit` — every `RecentEntry` field except `visitedAt`, which the hook stamps itself. */
export type RecentEntryInput = DistributiveOmit<RecentEntry, "visitedAt">;

/**
 * `CardElement` — one unit inside a composable `DashboardCard` (Phase 9-ii,
 * overhaul brief, owner-expanded 2026-11-02). The 7 `RecentEntry` kinds
 * minus `visitedAt` (a card holds its own `createdAt`/`updatedAt` instead —
 * visit timestamps stop being meaningful once a card can hold several
 * elements a user composed by hand), plus 3 new kinds the owner named:
 * `text` (free prose, no identity — authored directly, never auto-recorded),
 * `link` (a bare bookmark, distinct from `page`: not tied to a real
 * `NavMeta`-tagged route, so it is never auto-tracked by `RecentVisitTracker`
 * either), and `form` (an inline quick-edit, reusing `<QuickFormDrawer>`'s
 * `schema`+`fields` contract rendered in-card instead of in a drawer).
 *
 * A card's `elements` array can mix several of the SAME kind — "multiple
 * charts, multiple toggles, multiple links" was the owner's own example —
 * which is exactly why this is a per-element union nested inside
 * `DashboardCard.elements: CardElement[]`, not a 10th `RecentEntry` kind.
 */
export type CardElement =
  | { kind: "page"; href: string; label: string }
  | { kind: "toggle"; toggleId: string; label: string }
  | { kind: "chart"; chartId: string; label: string }
  | { kind: "settingPreview"; settingId: string; label: string }
  | { kind: "adminRow"; resource: AdminRowResource; rowId: string; label: string }
  | { kind: "productCard"; productId: string; href: string; label: string }
  | { kind: "pdpSection"; productId: string; sectionId: PdpSectionId; label: string }
  | { kind: "text"; body: string }
  | { kind: "link"; href: string; label: string }
  | { kind: "form"; formId: string; label: string };

/**
 * `DashboardCard` — the composable unit a user's dashboard landing is made
 * of. `color` is a token KEY into the same `surface-tokens.ts` map every
 * other themeable surface uses (`SurfaceKey` or similar) — never a raw hex,
 * per the Theme/Tokens/Variants rule. `saved` distinguishes the two tiers:
 * an auto-created, capped-10, FIFO-evicted recent card (`saved: false`) from
 * a user-curated, uncapped one (`saved: true`) — see `SavedCardsMap` below.
 */
export interface DashboardCard {
  id: string;
  title?: string;
  color?: string;
  elements: CardElement[];
  saved: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Per-user saved cards, namespaced by `"{portal}:hub"` scope — same convention as `RecentlyVisitedMap`. Deliberately NO cap: "saving these cards so they're kept even if the history goes above 10" was the owner's own reason for a second, uncapped field rather than a flag on the capped one. */
export type SavedCardsMap = Record<string, DashboardCard[]>;

function legacyElementKey(entry: RecentEntry): string {
  switch (entry.kind) {
    case "page":
      return `page:${entry.href}`;
    case "toggle":
      return `toggle:${entry.toggleId}`;
    case "chart":
      return `chart:${entry.chartId}`;
    case "settingPreview":
      return `settingPreview:${entry.settingId}`;
    case "adminRow":
      return `adminRow:${entry.resource}:${entry.rowId}`;
    case "productCard":
      return `productCard:${entry.productId}`;
    case "pdpSection":
      return `pdpSection:${entry.productId}:${entry.sectionId}`;
  }
}

/**
 * Wraps one OLD-shape `RecentEntry` (the shape shipped by Phase 9/10, still
 * what `uiPreferences.recentlyVisited` holds in Firestore) as a single-
 * element `DashboardCard`, at READ time — never a migration script, never a
 * Firestore write. Same technique `getCartLineMembers()` already uses for
 * `bundleProductIds` back-compat (CLAUDE.md's documented precedent): the new
 * field becomes authoritative going forward, the old shape keeps reading
 * correctly through a wrapper, and zero existing `uiPreferences` documents
 * need touching.
 *
 * `id` reuses the exact identity each `RecentEntry` kind already had via
 * `entryKey()` in `useRecentlyVisited.ts` — same string, so a card migrated
 * from an old entry and a freshly-recorded one for the same target dedupe
 * identically once the hook moves to this shape.
 */
export function cardFromLegacyEntry(entry: RecentEntry): DashboardCard {
  const { visitedAt, ...rest } = entry;
  return {
    id: legacyElementKey(entry),
    elements: [rest as CardElement],
    saved: false,
    createdAt: visitedAt,
    updatedAt: visitedAt,
  };
}
