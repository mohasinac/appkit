import type { IconKey } from "../../../ui/icons/icon-registry";

/**
 * Category-neutral default copy for homepage sections.
 *
 * Every `cleanTitle(cfg?.title) || "…"` fallback in `lib/section-renderer.tsx`
 * resolves here. Before this file the renderer carried ~25 hardcoded English
 * strings, several of them brand- or catalogue-specific — "India's #1
 * Marketplace", "Why Buyers Trust LetItRip", and an announcement-bar fallback
 * naming a Pokémon TCG promotion. appkit is a library; a consumer's brand and
 * catalogue must not be compiled into it.
 *
 * Three tiers own the copy on this page, and the split is deliberate:
 *
 *   Tier A — THIS FILE. Generic defaults that read correctly for any
 *            marketplace regardless of what it sells.
 *   Tier B — `MarketplaceHomepageViewProps.brand`, passed by the consumer from
 *            its own single source of site identity.
 *   Tier C — optional `*SectionConfig` fields, so an admin can override any of
 *            these per section instance without a deploy.
 *
 * Not `appkit.config.js`: the renderer runs inside appkit's own RSC, and that
 * file lives on the CONSUMER side of the seam. Importing it from here would
 * invert the library dependency — the Duplication Framework's "Lane / API
 * boundary" clause, and what `audit-ssr-in-appkit` Rule 3 protects.
 *
 * Keep every string here catalogue-neutral. "Shop by Category" survives the
 * catalogue changing; "Burst & X Series" does not.
 */

/** Section headings. Overridable per instance via `config.title`. */
export const SECTION_TITLE = {
  welcome: "Discover Amazing Products",
  categories: "Shop by Category",
  products: "Featured Products",
  collectorDrops: "Live Collector Drops",
  preOrders: "Reserve Before It Ships",
  stores: "Featured Stores",
  events: "Events & Offers",
  reviews: "What Our Customers Say",
  banner: "Thousands of collectibles. One marketplace.",
  trustIndicators: "Why Buyers Trust Us",
  features: "Security You Can Trust",
  whatsappCommunity: "Join Our Community",
  faq: "Frequently Asked Questions",
  blogArticles: "From Our Blog",
  newsletter: "Stay Updated",
  brands: "Top Brands",
  featuredBundles: "Curated Bundles",
} as const;

/**
 * "View all →" links. Overridable per instance via `config.viewMoreLabel`.
 *
 * These were hardcoded at every call site with no config path at all, so an
 * admin could rename a section's heading and not its own link.
 */
export const VIEW_MORE_LABEL = {
  categories: "All categories →",
  products: "View all products →",
  collectorDrops: "View all collector drops →",
  preOrders: "View all pre-orders →",
  stores: "View all stores →",
  events: "View all events →",
  reviews: "See all reviews →",
  blogArticles: "View all posts →",
  brands: "All brands →",
  faq: "View all FAQs →",
} as const;

/** Supporting copy that has no per-section config field of its own. */
export const SECTION_COPY = {
  welcomePill: "Buy, sell & collect",
  welcomePrimaryCta: "Shop Now",
  welcomeSecondaryCta: "Browse All",
  featuresPill: "Built for trust",
  featuresLearnMore: "Learn about our security →",
  bannerPrimaryCta: "Shop All Products →",
  /*
   * 🛑 Not "Browse Collector Drops →". The CTA banner is NOT in
   * `HOMEPAGE_SECTION_LISTING_TYPE`, so unlike the collector drops rail it is never
   * gated — it renders whatever this says on a site running
   * `listings.listingTypes.collector-drop: false`, which is a button on the homepage
   * leading to a browse page with nothing in it. The `secondaryHref` default in
   * CTABannerSection.tsx moved with it; they are one control in two files.
   */
  bannerSecondaryCta: "Browse Categories →",
  /** Eyebrow above the CTA banner headline — replaces a decorative ✨. */
  bannerEyebrow: "Start here",
  whatsappDescription:
    "Get deal alerts, new arrivals, and exclusive drops before anyone else.",
  /**
   * Shown only when `siteSettings.announcementBar` has no message. Was a
   * hardcoded seasonal Pokémon TCG discount, which would have gone out as
   * live promotional copy on any install that left the bar unconfigured.
   */
  announcementFallback: "Free shipping on eligible orders — shop the latest arrivals.",
} as const;

/**
 * Trust chips under the hero headline.
 *
 * Kept as a fixed generic default rather than a config field: making it
 * editable needs a repeater UI in the section builder, which is
 * disproportionate to four short labels that are true of any marketplace.
 * Revisit if a consumer needs different ones.
 */
export const WELCOME_TRUST_CHIPS = [
  /*
   * 🛑 Registry icon keys, not emoji.
   *
   * An emoji cannot be sized — no width or height utility reaches a text
   * character, so it renders at whatever the platform font fallback is, next to
   * a label that IS sized (Root Cause #80). It is also a different glyph on
   * every OS, which is the opposite of a design system.
   *
   * `🚀` was additionally just wrong: a rocket is not delivery. `ship` is a
   * truck. Labels are sentence case — Title Case On Four Short Chips reads
   * dated on its own.
   */
  { key: "delivery", iconName: "ship", label: "Fast delivery" },
  { key: "secure", iconName: "lock", label: "Secure payments" },
  { key: "rating", iconName: "review", label: "Buyer rated" },
  { key: "returns", iconName: "restore", label: "Easy returns" },
] as const satisfies readonly { key: string; iconName: IconKey; label: string }[];
