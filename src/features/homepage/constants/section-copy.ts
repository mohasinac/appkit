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
  auctions: "Live Auctions",
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
  auctions: "View all auctions →",
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
  bannerSecondaryCta: "Browse Auctions →",
  whatsappDescription:
    "Get deal alerts, auction updates, and exclusive drops before anyone else.",
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
  { key: "delivery", emoji: "🚀", label: "Fast Delivery" },
  { key: "secure", emoji: "🔒", label: "Secure Payments" },
  { key: "rating", emoji: "⭐", label: "Buyer Rated" },
  { key: "returns", emoji: "↩️", label: "Easy Returns" },
] as const;
