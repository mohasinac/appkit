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

import type { RowSpan } from "../../../../utils/pack-by-span";
import type { ContentTag } from "../content-tags/registry";

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

/**
 * Closed vocabulary for `functionalSlot` elements (below) — a REAL,
 * developer-wired functional control (not free-floating admin content) that
 * a composed card can opt into. Grows only by a code change, same as
 * `AdminRowResource`/`PdpSectionId` above — never admin-typed input, because
 * the id is the ONLY thing standing between an admin picking from a short,
 * pre-vetted list and an admin naming arbitrary code to execute.
 *
 * `"pdp-offer-action"` (2026-11-05, the pilot) — the standard PDP's
 * `renderOfferAction` slot (the "Make an Offer" button), piloted first
 * because a misconfigured/removed override leaves the PRIMARY purchase path
 * untouched.
 *
 * `"pdp-primary-actions"` (2026-11-05) — the standard PDP's
 * `renderPrimaryActions` slot (Buy Now / Add to Cart / Wishlist), the
 * control the owner actually named ("replace the offer/buy buttons at
 * runtime"). Covers ONLY the desktop-rail position — the same render prop's
 * second call site (`variant: "mobile"`) is a `useBottomActions()`
 * REGISTRATION side effect, not a duplicable visible slot, and always fires
 * regardless of any composed override (suppressing it would break the
 * mobile buy bar site-wide for a purely additive widget feature).
 */
export type FunctionalSlotId = "pdp-offer-action" | "pdp-primary-actions";

/** Admin-facing labels for `FunctionalSlotId` — used by the editor's slot picker once a second entry existed. */
export const FUNCTIONAL_SLOT_LABELS: Record<FunctionalSlotId, string> = {
  "pdp-offer-action": "Offer action (Make an Offer button)",
  "pdp-primary-actions": "Primary actions (Buy Now / Add to Cart / Wishlist)",
};

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
 * Phase 3B (2026-11-03, "Shopify/Webflow-like widget system") adds 3 more,
 * for the widget-on-every-page rollout rather than the dashboard-only
 * original set:
 * - `image` — `mediaUrl` MUST be a `/media/<slug>` URL (Media Architecture
 *   rule), never a raw Storage URL. `alt` is REQUIRED, not optional — an
 *   image element with no alt text is exactly the a11y gap the rest of this
 *   codebase's primitives already refuse to allow.
 * - `richText` — `html` is pre-sanitized at authoring time by the same
 *   `<RichTextEditor>` every other rich-text surface in this codebase uses;
 *   this type does not re-sanitize, it trusts the editor that produced it.
 * - `cta` — a real styled button, not a styled label. `variant` is loosely
 *   typed `string` here on purpose, matching `DashboardCard.color`'s own
 *   convention just below: this is a shared, UI-framework-agnostic type
 *   file, so it must not import `Button.tsx`'s module-private
 *   `UI_BUTTON.variants`. The real, closed variant check lives at the one
 *   place that already imports `Button` — `DashboardCardRenderer.tsx`.
 *
 * `variant`/`mediaUrl`/`html` are all capped in the PATCH route's Zod schema
 * (`appkit/src/_internal/shared/features/dashboard/cardElementSchema`-shaped
 * validation in `src/app/api/admin/page-regions/[pageId]/route.ts`), not
 * here — this file stays schema-free, matching every other type in it.
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
  /**
   * `context` added 2026-11-04, resolving the gap `DashboardCardRenderer.tsx`'s
   * own doc comment named: a bare `formId` string has nowhere to carry
   * "which store/record this quick-create happens under". Optional and
   * unused by the first real registry entry (`quick-add-faq`, which has no
   * owning record) — present so a future store-scoped form (e.g. "quick
   * add product under THIS store") has an answer from day one rather than
   * needing a second type change.
   */
  | { kind: "form"; formId: string; label: string; context?: string }
  | { kind: "image"; mediaUrl: string; alt: string; label?: string; href?: string }
  | { kind: "richText"; html: string; label?: string }
  | { kind: "cta"; href: string; label: string; variant?: string }
  /**
   * `functionalSlot` — added 2026-11-05 (owner's direct instruction, after
   * investigating the PDP widget-ization item: "build a new, riskier card
   * kind for functional slots... so an admin could genuinely replace the
   * offer/buy buttons at runtime"). STRUCTURALLY DIFFERENT from every other
   * kind above: every other kind either carries its own content inline
   * (`text.body`, `image.mediaUrl`, `cta.href`) or resolves an id through a
   * STATIC, context-free lookup (`adminRow` → a URL template,
   * `pdpSection`/`productCard` → a route, never live price/stock/session
   * state). `functionalSlot` is the first kind whose rendered content is
   * supplied by the PAGE ITSELF at render time, through a page-specific
   * `functionalSlots` map threaded down from whatever mounts
   * `AdminComposableRegion` for that surface — see `DashboardCardRenderer.tsx`'s
   * `DashboardCardElementBody` for the resolution, and `ProductDetailPageView.tsx`
   * for the one real producer. An admin can only ever pick WHICH closed,
   * pre-vetted `slotId` to place and WHERE — never author or alter what that
   * slot actually renders.
   *
   * Confirmed with the owner (2026-11-05) that this is TEMPLATE-WIDE, not
   * per-product: `AdminComposableRegion`'s `pageId` is a single static
   * literal shared by every product of a listing type (`"products-slug"`,
   * not `"products-slug-${slug}"`), so placing this element affects the
   * offer-action slot on EVERY standard product simultaneously, not one —
   * the same scope every other card on these pages already has.
   */
  | { kind: "functionalSlot"; slotId: FunctionalSlotId; label: string };

/**
 * A card element's claimed width within its row — reuses `RowSpan`
 * (`appkit/src/utils/pack-by-span.ts`), the same closed full/pair/third/
 * quarter vocabulary `field-ui-meta.ts`'s `FieldRow` already uses for form
 * fields. Owner's own instruction: *"support resize... on the widgets
 * too"*, then correcting the first-draft idea of a free per-element
 * stretch: *"the resize should be in breakpoints not on stretching as per
 * needs"* — answered with the SAME discrete, breakpoint-driven packing
 * forms already use (full width on mobile, N-up from `sm`/`lg`), via a
 * `<Select>` of 4 options, never a drag handle or a continuous slider (see
 * `DashboardCardEditPanel`).
 *
 * Keyed by element INDEX in a separate, optional `DashboardCard.spans` map
 * rather than added to `CardElement` itself, so every existing stored card
 * (none of which have ever had a span) continues to parse unchanged —
 * absent means `"full"`, matching `packBySpan`'s own default for this
 * caller (see that function's doc comment for why the default differs from
 * forms').
 */
export type CardElementSpan = RowSpan;

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
  /**
   * Optional per-element width override, keyed by the element's own index in
   * `elements` — as a STRING key (`"0"`, `"1"`, …), not a number. JSON (and
   * therefore both the Firestore document and the Zod schema validating the
   * PATCH body) has no numeric object keys at the wire level; typing this
   * `Record<number, …>` would make a perfectly valid `{ "0": "pair" }`
   * payload fail a strict assignability check for a reason that is a
   * TypeScript artifact, not a real data problem. Absent (the common case —
   * every card before Phase 3B's widget-system rollout) means every element
   * renders `"full"`, identical to today's single vertical `<Stack>`
   * layout. A sparse map rather than a field on `CardElement` itself — see
   * `CardElementSpan`'s own doc comment.
   */
  spans?: Record<string, CardElementSpan>;
  /**
   * Whole-card content-tag gate — the SAME `ContentTag`/`isContentVisible`
   * mechanism Phase 1A already wired into FAQ/nav/blog/support/scam/events/
   * legal content (`_internal/shared/features/content-tags/registry.ts`),
   * applied to a widget card for the first time (owner's instruction,
   * 2026-11-03: "all of these widgets are used to be enabled disabled with
   * tags... from the admin"). Absent/empty means always visible, same as
   * every other `contentTags` consumer. Card-level, not per-element —
   * matches the existing convention of tagging at the DOCUMENT a reader
   * sees, not a sub-fragment of it (fragment-level gating already exists
   * separately, via `answerFragments`/`resolveFragmentedAnswer`, for
   * content that only PARTLY depends on a flag — a card is small enough
   * that whole-card gating is the right grain here).
   */
  contentTags?: ContentTag[];
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
