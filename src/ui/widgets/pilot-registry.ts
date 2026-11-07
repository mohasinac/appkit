/**
 * The pilot widget registry — one real region, proved end to end.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS REGION AND NOT A SYNTHETIC ONE
 * ---------------------------------------------------------------------------
 *
 * `appkit/src/features/products/components/RelatedItemsSection.tsx` is 55
 * lines and is the owner's own example, four times over, hardcoded:
 *
 *   {relatedItems.length   > 0 && <RelatedProductsCarousel items={relatedItems}   title={`More in ${categoryLabel}`} />}
 *   {relatedByBrand.length > 0 && <RelatedProductsCarousel items={relatedByBrand} title={`More by ${brandLabel}`} />}
 *   {relatedByTags.length  > 0 && <RelatedProductsCarousel items={relatedByTags}  title="You might also like" />}
 *   {relatedByStore.length > 0 && <RelatedProductsCarousel items={relatedByStore} title={`More from ${storeLabel}`} />}
 *
 * Owner: *"similarly for horizontal scrollers, related items, recommendations,
 * sellers other items can be a widget with cards where a widget inside
 * another widget"* — all four of those are the four lines above. They differ
 * ONLY in data source and title, i.e. in config, and are expressed as four
 * JSX branches with four hardcoded strings. One widget type with four
 * instances is a strict reduction in code, and it is the first thing in this
 * tree that is honestly a container widget with card children.
 *
 * The region is the PDP's real one: `pageId="products-slug"`, mounted at
 * `ProductDetailPageView.tsx:1410`. Not invented — chosen because it already
 * exists, is already admin-composable, and already carries the two real
 * `FunctionalSlotId` values.
 *
 * ---------------------------------------------------------------------------
 * HOW THE REQUIRED-FIELD HALF IS PROVED ON THE SAME REGION
 * ---------------------------------------------------------------------------
 *
 * The PDP's offer board is the one widget on this surface that OWNS fields
 * (`offerAmount`, `offerMessage`), so blocking it is the real instance of the
 * owner's rule: *"if the user blocks the widgets tag or stuff they become
 * disabled and not required."* The live-media widget is included because it
 * owns `video.url`, which Lane G's module classifies **system** tier
 * (safety — *"buyers must see the actual animal/plant moving before
 * purchase"*). Blocking that one must NOT silently drop the requirement; it
 * must be refused. Both branches of the rule therefore sit on one region, and
 * one assertion run covers both.
 *
 * 🛑 This file is DATA, not rendering. Renderers live in a separate `.tsx`
 * that only the rendering surface imports — see `types.ts`'s header for the
 * Root Cause #76 reason.
 */

import type { WidgetDef, WidgetRegionDef } from "./types";

/** The one real region this pilot covers. `products-slug` is the live `pageId`. */
export const PILOT_REGIONS: readonly WidgetRegionDef[] = [
  {
    id: "products-slug:body",
    surface: "product",
    label: "Product detail — body",
    allowedTypes: ["row.horizontalScroller", "section.offerBoard", "section.liveMediaProof"],
  },
];

/**
 * Where a related scroller gets its items. A CLOSED vocabulary, not free text
 * — the same reasoning `FunctionalSlotId` states for itself: *"the id is the
 * ONLY thing standing between an admin picking from a short, pre-vetted list
 * and an admin naming arbitrary code to execute."* Each value maps 1:1 onto a
 * prop `RelatedItemsSection` already receives.
 */
export const RELATED_SOURCES = ["category", "brand", "tags", "store"] as const;
export type RelatedSource = (typeof RELATED_SOURCES)[number];

/** `row.horizontalScroller`'s config bag. The four hardcoded JSX branches become four of these. */
export interface RelatedScrollerConfig {
  source: RelatedSource;
  /** Title. A CONFIG value, which is exactly why it must not participate in the instance identity. */
  title: string;
  maxItems?: number;
}

export const PILOT_WIDGET_DEFS: readonly WidgetDef[] = [
  /*
   * T2 — the container. `childTypes: ["card.product"]` is what makes "a
   * widget inside another widget" a declared capability rather than an
   * accident, and what caps nesting depth without a runtime guard.
   */
  {
    type: "row.horizontalScroller",
    tier: "section",
    label: "Related items scroller",
    surfaces: ["product", "category", "store"],
    childTypes: ["card.product"],
  },

  /*
   * T3 — the card child. A leaf: `childTypes: []`.
   *
   * 🛑 Registry keys are `category.type`, deliberately matching the key
   * convention the concurrent mock-UI session already settled on
   * (`mocks/01-widgets.qm`, page "Catalogue": *"Registry key = category.type"*
   * — `card.product`, `row.horizontalScroller`, `section.clearanceStrip`,
   * `form.section`). Adopted rather than invented: two spellings for one
   * registry is precisely the defect that produced `nav-brands` vs
   * `nav-public-brands` and three incompatible `HomepageSectionType`
   * vocabularies. The `category.` prefix also carries real information — it
   * is the tier, readable without a registry lookup.
   */
  {
    type: "card.product",
    tier: "element",
    label: "Product card",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
  },

  /*
   * T2 — owns CONFIG-tier fields. Blocking it must make `offerAmount` /
   * `offerMessage` disabled AND NOT REQUIRED.
   *
   * `requiredPermission` rather than a role check: a permission is a grant,
   * and a role is a named bundle of them. The owner's own case — *"if I give
   * a user permission for viewing sellers' lists, that can happen"* — is only
   * possible this way.
   */
  {
    type: "section.offerBoard",
    tier: "section",
    label: "Offer board",
    surfaces: ["product"],
    childTypes: [],
    requiredPermission: "offers.view",
    ownsFields: ["offerAmount", "offerMessage"],
    governedBy: [{ governs: "listingType", value: "standard" }],
  },

  /*
   * T2 — owns a SYSTEM-tier field (`video.url`). Blocking it must NOT drop
   * the requirement; the configuration has to be refused instead, because no
   * default video of an unfilmed animal exists.
   */
  {
    type: "section.liveMediaProof",
    tier: "section",
    label: "Live-item media proof",
    surfaces: ["product"],
    childTypes: [],
    ownsFields: ["video.url"],
    governedBy: [{ governs: "listingType", value: "live" }],
  },
];
