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

import type { WidgetDef, WidgetInstance, WidgetRegionDef } from "./types";

/** The one real region this pilot covers. `products-slug` is the live `pageId`. */
export const PILOT_REGIONS: readonly WidgetRegionDef[] = [
  {
    id: "products-slug:body",
    surface: "product",
    label: "Product detail — body",
    allowedTypes: ["row.horizontalScroller", "card.product", "section.offerBoard", "section.liveMediaProof"],
  },
  /**
   * The LIVE region this slice actually drives — `RelatedItemsSection`'s four
   * carousels. Separate from `:body` because they are different holes in the
   * same template: `:body` is `AdminComposableRegion`'s admin-curated grid
   * (mounted at `ProductDetailPageView.tsx:1409`), this one is the
   * `renderRelated` slot a few lines above it.
   */
  {
    id: "products-slug:related",
    surface: "product",
    label: "Product detail — related items",
    allowedTypes: ["row.horizontalScroller"],
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

/**
 * `row.horizontalScroller`'s config bag. The four hardcoded JSX branches
 * become four of these.
 *
 * 🛑 `titleTemplate` + `fallbackTitle` rather than one `title`, because the
 * four branches being replaced do NOT have fixed titles — three of them
 * interpolate a label that may be absent:
 *
 *   title={categoryLabel ? `More in ${categoryLabel}` : "More in this category"}
 *
 * Collapsing that to a single `title` would silently change what three of the
 * four carousels say the moment a product has no category/brand/store label.
 * The value-validation bar for this slice is "the page renders the same
 * headings it rendered before", so the config has to express the conditional,
 * not approximate it.
 */
export interface RelatedScrollerConfig {
  source: RelatedSource;
  /** `{label}` is substituted with the source's label when one is available. */
  titleTemplate: string;
  /** Used verbatim when the source has no label. */
  fallbackTitle: string;
  maxItems?: number;
}

/** Narrow a stored `config` bag to this widget's shape, tolerating a malformed row. */
export function asRelatedScrollerConfig(
  config: Record<string, unknown> | undefined,
): RelatedScrollerConfig | undefined {
  const source = config?.source;
  if (typeof source !== "string" || !(RELATED_SOURCES as readonly string[]).includes(source)) {
    return undefined;
  }
  const titleTemplate = typeof config?.titleTemplate === "string" ? config.titleTemplate : "";
  const fallbackTitle = typeof config?.fallbackTitle === "string" ? config.fallbackTitle : "";
  const maxItems = typeof config?.maxItems === "number" ? config.maxItems : undefined;
  return { source: source as RelatedSource, titleTemplate, fallbackTitle, maxItems };
}

/** Resolve a scroller's heading exactly as the hardcoded branches did. */
export function resolveScrollerTitle(cfg: RelatedScrollerConfig, label: string | undefined): string {
  if (label && cfg.titleTemplate.includes("{label}")) {
    return cfg.titleTemplate.replace("{label}", label);
  }
  if (label && cfg.titleTemplate) return cfg.titleTemplate;
  return cfg.fallbackTitle || cfg.titleTemplate;
}

/**
 * The DEFAULT instance list for `products-slug:related` — the four hardcoded
 * carousels in `RelatedItemsSection.tsx`, expressed as data.
 *
 * 🛑 This lives in CODE on purpose. It is the TEMPLATE DEFAULT, and §12.4's
 * second cost control depends on it: a default row costs **zero** config rows
 * until somebody changes it. Stored rows exist only for divergence, which is
 * what keeps the ~5,210-key ceiling theoretical rather than a table someone
 * has to populate.
 *
 * 🛑 Ids are hand-written and STABLE FOREVER, never minted per render. They are
 * the identity an override targets, so a render-time `genCardId()` would make
 * every override orphan itself on the next paint — the same class of failure
 * as deriving a nav id from an href. Hand-written is right for a template
 * default precisely because there is exactly one of it.
 */
export const RELATED_DEFAULT_INSTANCES: readonly WidgetInstance[] = [
  {
    id: "w-related-category",
    type: "row.horizontalScroller",
    regionId: "products-slug:related",
    parentId: null,
    order: 0,
    config: { source: "category", titleTemplate: "More in {label}", fallbackTitle: "More in this category" },
  },
  {
    id: "w-related-brand",
    type: "row.horizontalScroller",
    regionId: "products-slug:related",
    parentId: null,
    order: 1,
    config: { source: "brand", titleTemplate: "More by {label}", fallbackTitle: "More by this brand" },
  },
  {
    /*
     * The owner's "recommendations". Its title never interpolated a label in
     * the original, so template and fallback are identical — the shape still
     * carries both so ONE config type covers all four.
     */
    id: "w-related-tags",
    type: "row.horizontalScroller",
    regionId: "products-slug:related",
    parentId: null,
    order: 2,
    config: { source: "tags", titleTemplate: "You might also like", fallbackTitle: "You might also like" },
  },
  {
    /** The owner's "sellers other items". */
    id: "w-related-store",
    type: "row.horizontalScroller",
    regionId: "products-slug:related",
    parentId: null,
    order: 3,
    config: { source: "store", titleTemplate: "More from {label}", fallbackTitle: "More from this seller" },
  },
];

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
   * T3 — the card. 🛑 A CONTAINER, not a leaf, as of the owner's granularity
   * ruling (2026-11-08): *"`price` on a product card is a WIDGET, not a
   * field."* So a card holds element widgets, and the containment tree the
   * mock's Composition page draws is now the real one:
   *
   *   region > row.horizontalScroller > card.product > element.price
   *
   * This was `childTypes: []` in the first draft and the change is structural,
   * not a config tweak — the resolver's leaf-nesting refusal, its cycle guard
   * cost and five assertions all moved with it.
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
    tier: "section",
    label: "Product card",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [
      "element.image",
      "element.title",
      "element.price",
      "element.condition",
      "element.badge",
      "element.cta",
      "element.link",
    ],
  },

  /*
   * T3 leaf elements — the bottom of the addressable model. Below these are
   * only T5 atoms (`Div`, `Stack`, `Row`, `Grid`), which stay token-themed and
   * never get a config key. Measured: 5,210 leaf render sites across 888
   * components in `appkit/src` vs 4,604 pure-layout sites that do NOT get keys.
   *
   * 🛑 `removable: false` on price and condition is A16's guardrail with a
   * mechanism behind it for the first time: *"Required elements cannot be
   * removed: price, condition, authenticity claim, the risk banner, consent
   * affordances … A vendor may restyle them, never hide them."* Before the
   * owner's ruling this was a required-FIELD rule; now that `price` is a
   * widget, it has to be a widget capability or it has no enforcement at all.
   */
  {
    type: "element.price",
    tier: "element",
    label: "Price",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
    removable: false,
    ownsFields: ["price"],
  },
  {
    type: "element.condition",
    tier: "element",
    label: "Condition",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
    removable: false,
    ownsFields: ["condition"],
  },
  {
    type: "element.title",
    tier: "element",
    label: "Title",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
    ownsFields: ["name"],
  },
  {
    type: "element.image",
    tier: "element",
    label: "Image",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
    ownsFields: ["images"],
  },
  {
    type: "element.badge",
    tier: "element",
    label: "Badge",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
  },
  {
    type: "element.cta",
    tier: "element",
    label: "Call to action",
    surfaces: ["product", "category", "store", "homepage"],
    childTypes: [],
  },
  /** The owner's "down to a single link". A leaf that carries its own `href` + `label` in config. */
  {
    type: "element.link",
    tier: "element",
    label: "Link",
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
