/**
 * WIDGET TEMPLATES — the registry every surface renders from.
 *
 * Owner, 2026-11-08: *"homepage sections, event carousels, blogs rail, review
 * rail, social media rails etc are also seeded widgets — all go into the
 * widgets."* And: *"the default layouts, composed widgets, arrangements and all
 * are also seed data."*
 *
 * So there is ONE registry. A homepage band, a PDP band, a store-page section,
 * a dashboard tile and a card inside a scroller are all rows here, differing by
 * `kind`, `tags` and which elements they declare.
 *
 * ## 🛑 This file does NOT re-seed the homepage
 *
 * `homepage-sections-seed-data.ts` already seeds 28 section types with real
 * copy, ordering and enable flags. Duplicating them here would create exactly
 * the divergent second copy the project forbids. Instead every one of its
 * `type` values appears in `legacySectionType` below, so the migration is a
 * JOIN rather than a rewrite: the section row keeps the copy and the order, and
 * gains a widget key that says how it renders.
 *
 * ## The granularity rule (owner-approved 2026-11-08)
 *
 * A thing is a widget if it has ANY of: its own data link, its own visibility
 * rule, or independent reuse. Otherwise it is a property of its parent. Nesting
 * is capped at 4 — region › widget › child widget › element.
 *
 * ## Required elements
 *
 * `requiredElements` can be restyled and moved by a vendor, never removed: the
 * editor offers no ✕ on them, and a template update merges new ones into every
 * existing clone.
 *
 * ## 🛑 Vocabulary, and the migration this file does NOT do
 *
 * Owner, 2026-11-08: *"rename all to avoid words like gambling, raffles, auction
 * houses etc."* Done for everything authored here — `row.giveawayRail`, the
 * `giveaway` event type, the `giveawayEntry` mechanism.
 *
 * `legacySectionType` values below still read `event-raffles` because they are
 * FOREIGN KEYS into `homepage-sections-seed-data.ts`, which this file must not
 * contradict. Renaming those is part of a wider sweep: **188 files outside
 * `seed/` still use raffle / giveaway / auction vocabulary** (138 in appkit, 50
 * in the host app), including a whole `giveawayEntries` collection with manifest
 * and purge entries. That is an all-or-nothing migration touching live data —
 * it is flagged in the plan, not half-done here.
 *
 * Mocks: `mocks/01-widgets.qm` (*Catalogue*, *Composition*),
 *        `mocks/12-admin-settings.qm` (*Widget registry*).
 */

export type WidgetKind =
  | "card"
  | "row"
  | "grid"
  | "section"
  | "chrome"
  | "form"
  | "tile"
  | "slot";

export interface WidgetTemplate {
  /** Stable registry key: `<kind>.<name>`. Never renamed. */
  key: string;
  label: string;
  kind: WidgetKind;
  /** What it reads. Blocking this deactivates every instance. */
  dataLink: string | null;
  /** Starting tags; A7c auto-tagging adds more from the source route. */
  tags: string[];
  /** Elements that cannot be removed from a clone. */
  requiredElements?: string[];
  /** Child widget keys this one composes, if it is a container. */
  children?: string[];
  /** Display modes this template supports — a flag, not a second template. */
  displayModes?: string[];
  /** Who may place it. Platform-only widgets never appear in a vendor composer. */
  placeableBy: ("admin" | "seller" | "user")[];
  /** The `type` value in homepage-sections-seed-data this key renders. */
  legacySectionType?: string;
  /** Default span on the 12-column grid. */
  defaultSpan?: 3 | 4 | 6 | 7 | 12;
}

export const widgetTemplatesSeedData: WidgetTemplate[] = [
  // ── cards ─────────────────────────────────────────────────────────────────
  { key: "card.product", label: "Product card", kind: "card", dataLink: "catalogue.listing", tags: ["product", "listing"], requiredElements: ["price", "condition", "authenticity", "riskBanner"], displayModes: ["grid", "list", "compact"], placeableBy: ["admin", "seller", "user"] },
  { key: "card.vendor", label: "Store card", kind: "card", dataLink: "stores.store", tags: ["store"], requiredElements: ["storeName", "rating"], placeableBy: ["admin"] },
  { key: "card.article", label: "Article card", kind: "card", dataLink: "blogs.post", tags: ["content", "blog"], placeableBy: ["admin", "seller"] },
  { key: "card.review", label: "Review card", kind: "card", dataLink: "reviews.review", tags: ["review", "ugc"], requiredElements: ["rating", "date"], placeableBy: ["admin", "seller", "user"] },
  { key: "card.order", label: "Order card", kind: "card", dataLink: "orders.order", tags: ["order"], requiredElements: ["orderId", "state", "total"], placeableBy: ["admin"] },
  { key: "card.event", label: "Event card", kind: "card", dataLink: "events.event", tags: ["event"], placeableBy: ["admin", "seller"] },

  // ── rows / rails — all one container with different data links ────────────
  { key: "row.horizontalScroller", label: "Horizontal rail", kind: "row", dataLink: "catalogue.query", tags: ["rail"], children: ["card.product"], displayModes: ["scroll", "carousel"], placeableBy: ["admin", "seller", "user"], defaultSpan: 12 },
  { key: "row.productCarousel", label: "Product carousel", kind: "row", dataLink: "catalogue.query", tags: ["rail", "product"], children: ["card.product"], displayModes: ["tabbed", "plain"], placeableBy: ["admin", "seller"], legacySectionType: "carousel", defaultSpan: 12 },
  { key: "row.relatedItems", label: "Related items", kind: "row", dataLink: "catalogue.related", tags: ["rail", "related"], children: ["card.product"], placeableBy: ["admin", "seller"], defaultSpan: 12 },
  { key: "row.recommendations", label: "Recommended for you", kind: "row", dataLink: "catalogue.recommended", tags: ["rail", "recommended"], children: ["card.product"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "row.sellerOtherItems", label: "More from this seller", kind: "row", dataLink: "catalogue.byStore", tags: ["rail", "store"], children: ["card.product"], placeableBy: ["admin", "seller"], defaultSpan: 12 },
  { key: "row.blogRail", label: "Blog rail", kind: "row", dataLink: "blogs.recent", tags: ["rail", "content", "blog"], children: ["card.article"], placeableBy: ["admin", "seller"], legacySectionType: "blog-articles", defaultSpan: 12 },
  { key: "row.reviewRail", label: "Review rail", kind: "row", dataLink: "reviews.recent", tags: ["rail", "review"], children: ["card.review"], placeableBy: ["admin", "seller"], legacySectionType: "reviews", defaultSpan: 12 },
  { key: "row.eventCarousel", label: "Event carousel", kind: "row", dataLink: "events.upcoming", tags: ["rail", "event"], children: ["card.event"], placeableBy: ["admin"], legacySectionType: "events", defaultSpan: 12 },
  { key: "row.giveawayRail", label: "Giveaway rail", kind: "row", dataLink: "events.giveaways", tags: ["rail", "event", "giveaway"], children: ["card.event"], placeableBy: ["admin"], legacySectionType: "event-raffles" /* the EXISTING homepage row key — renaming that collection is a separate migration, see below */, defaultSpan: 12 },
  { key: "row.socialFeed", label: "Social media rail", kind: "row", dataLink: "social.feed", tags: ["rail", "social", "ugc"], placeableBy: ["admin", "seller"], legacySectionType: "social-feed", defaultSpan: 12 },
  { key: "row.brandTiles", label: "Brand tiles", kind: "row", dataLink: "catalogue.brands", tags: ["rail", "brand"], placeableBy: ["admin"], legacySectionType: "brands", defaultSpan: 12 },
  { key: "row.storeTiles", label: "Featured stores", kind: "row", dataLink: "stores.featured", tags: ["rail", "store"], children: ["card.vendor"], placeableBy: ["admin"], legacySectionType: "stores", defaultSpan: 12 },
  { key: "row.categoryShowcase", label: "Category showcase", kind: "row", dataLink: "catalogue.categories", tags: ["rail", "category"], displayModes: ["stacked", "tabbed"], placeableBy: ["admin", "seller"], legacySectionType: "categories", defaultSpan: 12 },
  { key: "row.collectionCards", label: "Collection cards", kind: "row", dataLink: "collections.list", tags: ["rail", "collection"], placeableBy: ["admin"], legacySectionType: "collection-cards", defaultSpan: 12 },
  { key: "row.customCards", label: "Custom cards", kind: "row", dataLink: null, tags: ["rail", "custom"], placeableBy: ["admin", "seller"], legacySectionType: "custom-cards", defaultSpan: 12 },

  // ── grids and mosaics ─────────────────────────────────────────────────────
  { key: "grid.products", label: "Product grid", kind: "grid", dataLink: "catalogue.query", tags: ["grid", "product"], children: ["card.product"], displayModes: ["grid", "list", "table"], placeableBy: ["admin", "seller"], legacySectionType: "products", defaultSpan: 12 },
  { key: "grid.articlePreview", label: "Article grid", kind: "grid", dataLink: "blogs.recent", tags: ["grid", "content"], children: ["card.article"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "grid.reviews", label: "Review grid", kind: "grid", dataLink: "reviews.recent", tags: ["grid", "review"], children: ["card.review"], placeableBy: ["admin", "seller"], defaultSpan: 12 },
  { key: "grid.promo", label: "Promo grid", kind: "grid", dataLink: "promotions.active", tags: ["grid", "promo"], placeableBy: ["admin"], legacySectionType: "promo-grid", defaultSpan: 12 },
  { key: "mosaic.ugc", label: "UGC mosaic", kind: "grid", dataLink: "social.ugc", tags: ["mosaic", "ugc"], placeableBy: ["admin"], defaultSpan: 12 },

  // ── sections ──────────────────────────────────────────────────────────────
  { key: "section.hero", label: "Hero", kind: "section", dataLink: "campaigns.active", tags: ["campaign", "hero"], displayModes: ["carousel", "video", "static"], placeableBy: ["admin", "seller"], legacySectionType: "welcome", defaultSpan: 12 },
  { key: "section.banner", label: "Banner", kind: "section", dataLink: "campaigns.banner", tags: ["campaign", "banner"], placeableBy: ["admin", "seller"], legacySectionType: "banner", defaultSpan: 12 },
  { key: "section.promoStrip", label: "Promo strip", kind: "section", dataLink: "promotions.strip", tags: ["promo"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "section.couponStrip", label: "Coupon strip", kind: "section", dataLink: "coupons.claimable", tags: ["coupon"], placeableBy: ["admin"], legacySectionType: "coupons", defaultSpan: 7 },
  { key: "section.announcements", label: "Announcements", kind: "section", dataLink: "notices.active", tags: ["notice"], placeableBy: ["admin"], defaultSpan: 4 },
  { key: "section.whatsappBanner", label: "WhatsApp community banner", kind: "section", dataLink: "community.whatsapp", tags: ["community", "whatsapp"], placeableBy: ["admin"], legacySectionType: "whatsapp-community", defaultSpan: 12 },
  { key: "section.newsletter", label: "Newsletter signup", kind: "section", dataLink: "marketing.newsletter", tags: ["marketing"], requiredElements: ["consentCheckbox"], placeableBy: ["admin"], legacySectionType: "newsletter", defaultSpan: 12 },
  { key: "section.trustCounters", label: "Trust counters", kind: "section", dataLink: "metrics.trust", tags: ["trust"], placeableBy: ["admin"], legacySectionType: "trust-indicators", defaultSpan: 12 },
  { key: "section.stats", label: "Stats band", kind: "section", dataLink: "metrics.public", tags: ["trust", "stats"], placeableBy: ["admin"], legacySectionType: "stats", defaultSpan: 12 },
  { key: "section.features", label: "Feature list", kind: "section", dataLink: null, tags: ["content"], placeableBy: ["admin", "seller"], legacySectionType: "features", defaultSpan: 12 },
  { key: "section.processGuide", label: "How it works", kind: "section", dataLink: "workflows.registry", tags: ["content", "guide"], displayModes: ["tabbed", "zigzag"], placeableBy: ["admin"], legacySectionType: "how-it-works", defaultSpan: 12 },
  { key: "section.faq", label: "FAQ", kind: "section", dataLink: "faq.byTag", tags: ["content", "faq"], placeableBy: ["admin", "seller"], legacySectionType: "faq", defaultSpan: 12 },
  { key: "section.richText", label: "Rich text", kind: "section", dataLink: null, tags: ["content"], placeableBy: ["admin", "seller", "user"], defaultSpan: 12 },
  { key: "section.policyBlock", label: "Policy block", kind: "section", dataLink: "legal.published", tags: ["policy", "legal"], requiredElements: ["returnsPolicy", "shippingPolicy", "authenticityPolicy"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "section.specTable", label: "Specification table", kind: "section", dataLink: "wiki.attributes", tags: ["content", "spec"], placeableBy: ["admin", "seller"], defaultSpan: 12 },
  { key: "section.offerBook", label: "Offer book", kind: "section", dataLink: "offers.byListing", tags: ["offers"], requiredElements: ["windowClose", "autoAwardState", "publicNotice"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "section.revealCountdown", label: "Reveal countdown", kind: "section", dataLink: "clearance.reveal", tags: ["clearance", "reveal"], requiredElements: ["riskBanner", "cancelDeadline"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "section.clearanceStrip", label: "Clearance strip", kind: "section", dataLink: "catalogue.clearance", tags: ["clearance"], children: ["card.product"], placeableBy: ["admin"], legacySectionType: "clearance", defaultSpan: 12 },
  { key: "section.collectorDrops", label: "Collector drops", kind: "section", dataLink: "catalogue.collector", tags: ["collector"], children: ["card.product"], placeableBy: ["admin"], legacySectionType: "collector-drops", defaultSpan: 12 },
  { key: "section.preOrders", label: "Pre-orders", kind: "section", dataLink: "catalogue.preOrder", tags: ["pre-order"], children: ["card.product"], placeableBy: ["admin"], legacySectionType: "pre-orders", defaultSpan: 12 },
  { key: "section.featuredBundles", label: "Featured bundles", kind: "section", dataLink: "catalogue.bundles", tags: ["bundle"], children: ["card.product"], placeableBy: ["admin"], legacySectionType: "featured-bundles", defaultSpan: 12 },
  { key: "section.footer", label: "Footer", kind: "section", dataLink: "nav.footer", tags: ["nav"], placeableBy: ["admin"], defaultSpan: 12 },

  // ── chrome — navbar, titlebar and bars are widgets too (A17) ───────────────
  { key: "chrome.navbar", label: "Navbar", kind: "chrome", dataLink: "nav.clusters", tags: ["nav"], placeableBy: ["admin"] },
  { key: "chrome.titlebar", label: "Titlebar", kind: "chrome", dataLink: null, tags: ["nav"], placeableBy: ["admin"] },
  { key: "chrome.searchBar", label: "Search bar", kind: "chrome", dataLink: "search.public", tags: ["nav", "search"], placeableBy: ["admin"] },
  { key: "chrome.megaMenu", label: "Category mega-menu", kind: "chrome", dataLink: "catalogue.categories", tags: ["nav", "category"], placeableBy: ["admin"] },
  { key: "chrome.filterBar", label: "Filter bar", kind: "chrome", dataLink: "search.facets", tags: ["nav", "filter"], placeableBy: ["admin"] },
  { key: "chrome.breadcrumb", label: "Breadcrumb", kind: "chrome", dataLink: "nav.trail", tags: ["nav"], placeableBy: ["admin"] },
  { key: "chrome.bottomBar", label: "Mobile bottom bar", kind: "chrome", dataLink: "nav.primary", tags: ["nav", "mobile"], placeableBy: ["admin"] },
  { key: "chrome.tabStrip", label: "Dashboard tab strip", kind: "chrome", dataLink: "nav.clusters", tags: ["nav", "dashboard"], placeableBy: ["admin"] },
  { key: "chrome.omnibox", label: "Omnibox", kind: "chrome", dataLink: "search.dashboard", tags: ["nav", "search"], placeableBy: ["admin"] },

  // ── dashboard tiles ───────────────────────────────────────────────────────
  { key: "tile.stat", label: "Stat tile", kind: "tile", dataLink: "metrics.any", tags: ["dashboard"], placeableBy: ["admin", "seller", "user"], defaultSpan: 3 },
  { key: "tile.chart", label: "Chart", kind: "tile", dataLink: "metrics.any", tags: ["dashboard", "chart"], displayModes: ["bar", "line", "pie", "gauge"], placeableBy: ["admin", "seller", "user"], defaultSpan: 6 },
  { key: "tile.listPreview", label: "List preview", kind: "tile", dataLink: "records.any", tags: ["dashboard"], placeableBy: ["admin", "seller", "user"], defaultSpan: 6 },
  { key: "tile.groupedTable", label: "Grouped table", kind: "tile", dataLink: "records.any", tags: ["dashboard"], placeableBy: ["admin", "seller"], defaultSpan: 6 },
  { key: "tile.timeline", label: "Timeline", kind: "tile", dataLink: "workflows.instance", tags: ["dashboard"], placeableBy: ["admin", "seller", "user"], defaultSpan: 4 },
  { key: "tile.toggle", label: "Toggle", kind: "tile", dataLink: "settings.any", tags: ["dashboard", "settings"], placeableBy: ["admin", "seller"], defaultSpan: 3 },
  { key: "tile.cta", label: "Shortcut / CTA", kind: "tile", dataLink: "actions.registry", tags: ["dashboard"], placeableBy: ["admin", "seller", "user"], defaultSpan: 3 },
  { key: "tile.navSlot", label: "Nav slot", kind: "tile", dataLink: "nav.custom", tags: ["dashboard", "nav"], placeableBy: ["admin", "seller", "user"], defaultSpan: 3 },
  { key: "tile.searchResult", label: "Pinned search", kind: "tile", dataLink: "search.saved", tags: ["dashboard", "search"], placeableBy: ["admin", "seller", "user"], defaultSpan: 6 },

  // ── forms — a form is a widget whose output is another widget ─────────────
  { key: "form.listing", label: "Listing form", kind: "form", dataLink: "catalogue.listing", tags: ["form", "listing"], placeableBy: ["admin", "seller"], defaultSpan: 12 },
  { key: "form.section", label: "Form section", kind: "form", dataLink: null, tags: ["form"], placeableBy: ["admin", "seller"], defaultSpan: 6 },
  { key: "form.quick", label: "Quick form", kind: "form", dataLink: "forms.registry", tags: ["form"], placeableBy: ["admin", "seller", "user"], defaultSpan: 4 },
  { key: "form.select", label: "Select-with-create", kind: "form", dataLink: "records.any", tags: ["form"], placeableBy: ["admin", "seller"], defaultSpan: 4 },
  { key: "form.contact", label: "Contact / support form", kind: "form", dataLink: "support.ticket", tags: ["form", "support"], placeableBy: ["admin"], defaultSpan: 6 },

  // ── slots ─────────────────────────────────────────────────────────────────
  { key: "slot.ad", label: "Ad slot", kind: "slot", dataLink: "ads.placement", tags: ["ads"], requiredElements: ["sponsoredDisclosure"], placeableBy: ["admin"], defaultSpan: 12 },
  { key: "detail.product", label: "Product detail shell", kind: "section", dataLink: "catalogue.listing", tags: ["pdp"], requiredElements: ["price", "condition", "authenticity", "riskBanner", "consent"], placeableBy: ["admin"], defaultSpan: 12 },
];

export const widgetTemplatesByKey: Readonly<Record<string, WidgetTemplate>> =
  Object.freeze(Object.fromEntries(widgetTemplatesSeedData.map(w => [w.key, w])));

/**
 * The join back to the existing homepage seed. Every `type` value in
 * `homepage-sections-seed-data.ts` must appear here, so the migration can map
 * each seeded section onto a widget key without inventing a second list.
 *
 * `null` means: that section type has no distinct widget — it renders with
 * `section.richText` and its copy, and the migration should fold it in.
 */
export const legacySectionTypeToWidgetKey: Readonly<Record<string, string | null>> = Object.freeze({
  welcome: "section.hero",
  carousel: "row.productCarousel",
  "trust-indicators": "section.trustCounters",
  categories: "row.categoryShowcase",
  products: "grid.products",
  "collector-drops": "section.collectorDrops",
  "pre-orders": "section.preOrders",
  "featured-bundles": "section.featuredBundles",
  clearance: "section.clearanceStrip",
  coupons: "section.couponStrip",
  events: "row.eventCarousel",
  "event-raffles": "row.giveawayRail",
  reviews: "row.reviewRail",
  "blog-articles": "row.blogRail",
  "social-feed": "row.socialFeed",
  brands: "row.brandTiles",
  stores: "row.storeTiles",
  "collection-cards": "row.collectionCards",
  "custom-cards": "row.customCards",
  "promo-grid": "grid.promo",
  banner: "section.banner",
  "whatsapp-community": "section.whatsappBanner",
  newsletter: "section.newsletter",
  faq: "section.faq",
  "how-it-works": "section.processGuide",
  features: "section.features",
  stats: "section.stats",
  // Prize draws were disabled in the homepage seed; the giveaway rail covers them.
  "prize-draws": "row.giveawayRail",
});

/** Guards the join: an unmapped widget key is a typo waiting to render nothing. */
for (const [legacyType, key] of Object.entries(legacySectionTypeToWidgetKey)) {
  if (key && !(key in widgetTemplatesByKey)) {
    throw new Error(`legacy section type "${legacyType}" maps to unknown widget key "${key}"`);
  }
}
