import type { FirestoreDocument } from "@mohasinac/appkit";
import { ROUTES } from "../../../../next/routing/route-map";
import type { SectionType as CanonicalSectionType } from "../../../homepage/schemas/firestore";
/* The canonical category→label map. `FAQ_CATEGORY_OPTIONS` is derived from it
 * at the bottom of this file; see that comment for why a local list was a
 * data-destroying defect rather than a duplicate. */
import { FAQ_CATEGORY_LABELS } from "../../../faq/schemas/firestore";
const LABEL_VERIFIED_SELLERS = "Verified Sellers";

/*
 * The admin dropdown's section types.
 *
 * 🛑 This used to be a bare `as const` array with its OWN `SectionType` derived
 * from it — a second declaration shadowing the real `SectionType` in
 * `features/homepage/schemas/firestore.ts`, which is how the two came to
 * disagree with the create route (Recurrent Root Cause #36's shape, one union
 * over). The route's own copy was missing `featured-bundles`, `random-lots`,
 * `event-raffles` and `collection-cards`, so choosing any of those four in this
 * dropdown produced a 400 on save — four of twenty-five section types could be
 * configured in full and never created.
 *
 * It is now a `Record<CanonicalSectionType, true>`, so a type added to the
 * union and not offered here is a COMPILE error, and an entry here that is not
 * a real section type is too. Declaration order is preserved because the array
 * is derived from this map's keys, and that order is the dropdown's order.
 */
const SECTION_TYPE_PRESENCE: Record<CanonicalSectionType, true> = {
  welcome: true,
  stats: true,
  "trust-indicators": true,
  categories: true,
  brands: true,
  products: true,
  "pre-orders": true,
  "collector-drops": true,
  banner: true,
  features: true,
  reviews: true,
  "whatsapp-community": true,
  faq: true,
  "blog-articles": true,
  newsletter: true,
  stores: true,
  events: true,
  coupons: true,
  "social-feed": true,
  carousel: true,
  "custom-cards": true,
  "google-reviews": true,
  "featured-bundles": true,
  "random-lots": true,
  "event-raffles": true,
  "collection-cards": true,
  // Promoted out of the orphan-component set 2026-10-19. Offered here because
  // all three are deliberately UNSEEDED — the admin builder is the only way
  // one gets created, which is the point: the seed does not invent
  // placeholder "How It Works" steps or testimonials nobody said.
  "how-it-works": true,
  testimonials: true,
  "promo-grid": true,
};

export const SECTION_TYPE_OPTIONS = Object.keys(
  SECTION_TYPE_PRESENCE,
) as CanonicalSectionType[];

/** Re-exported, NOT re-declared. There is one `SectionType` in this codebase. */
export type SectionType = CanonicalSectionType;

export interface SectionPatchPayload {
  enabled: boolean;
  order?: number;
  config: FirestoreDocument;
}

export type ResourceMode = "automatic" | "manual";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ReorderItem {
  id: string;
  type: string;
  order: number;
}

export type ResourceSortBy = "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular";
export type ResourceMaxCount = 5 | 10 | 20;

export interface ProductsBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "published" | "draft";
  sortBy: ResourceSortBy;
  featuredOnly: boolean;
  inStockOnly: boolean;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
  filterByCategory: string;
  maxCount: ResourceMaxCount;
  loop: boolean;
}

export interface CollectorDropsBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "scheduled" | "ended";
  sortBy: ResourceSortBy;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
  filterByCategory: string;
  maxCount: ResourceMaxCount;
  loop: boolean;
}

export type StatsStatSource = "static" | "live-preset" | "live-collection";

export interface StatsBuilderState {
  title: string;
  stats: Array<{
    key: string;
    label: string;
    value: string;
    source: StatsStatSource;
    /** Preset metric key when source is "live-preset". */
    metric: string;
    /** Firestore collection name when source is "live-collection". */
    collection: string;
    /** Optional field to filter by when source is "live-collection". */
    filterField: string;
    /** Filter value (string form) when source is "live-collection". */
    filterValue: string;
    /** Appended after the live value, e.g. "+" or "★". */
    suffix: string;
  }>;
}

export interface PreOrdersBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "upcoming" | "closed";
  sortBy: ResourceSortBy;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
  filterByCategory: string;
  maxCount: ResourceMaxCount;
  loop: boolean;
}

export interface StoresBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "pending" | "disabled";
  sortBy: ResourceSortBy;
  verifiedOnly: boolean;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
  filterByCategory: string;
  maxCount: ResourceMaxCount;
  loop: boolean;
}

export interface EventsBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "upcoming" | "ended";
  sortBy: ResourceSortBy;
  featuredOnly: boolean;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
  filterByCategory: string;
  maxCount: ResourceMaxCount;
  loop: boolean;
}

export interface SocialFeedBuilderState {
  title: string;
  subtitle: string;
  platform: "instagram" | "facebook" | "tiktok" | "deviantart";
  handle: string;
  postType: "all" | "images" | "videos" | "reels";
  count: number;
  layout: "grid" | "masonry" | "carousel";
  showCaption: boolean;
  showStats: boolean;
}

export interface WelcomeBuilderState {
  h1: string;
  subtitle: string;
  description: string;
  showCTA: boolean;
  ctaText: string;
  ctaLink: string;
}

export interface TrustIndicatorsBuilderState {
  title: string;
  indicators: Array<{ id: string; icon: string; title: string; description: string }>;
}

export interface CategoriesBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  maxCategories: number;
  autoScroll: boolean;
  scrollInterval: number;
  loop: boolean;
}

export interface BrandsBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxBrands: number;
  autoScroll: boolean;
  scrollInterval: number;
  loop: boolean;
}

export interface BannerBuilderState {
  height: "sm" | "md" | "lg" | "xl";
  backgroundImage: string;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  contentTitle: string;
  contentSubtitle: string;
  contentDescription: string;
  buttons: Array<{ text: string; link: string; variant: "primary" | "secondary" | "outline" }>;
  clickable: boolean;
  clickLink: string;
}

export interface FeaturesBuilderState {
  title: string;
  features: string[];
}

/**
 * `source` / `placeId` were removed: this section only ever renders platform
 * reviews (`useHomepageReviews`), so choosing "google" here changed nothing.
 * The `google-reviews` section type is the real surface for that.
 */
export interface ReviewsBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  maxReviews: number;
  itemsPerView: number;
  autoScroll: boolean;
  scrollInterval: number;
  loop: boolean;
}

export interface WhatsAppBuilderState {
  title: string;
  description: string;
  groupLink: string;
  memberCount: number;
  benefits: string[];
  buttonText: string;
  testimonial: string;
}

/**
 * 🛑 This was a FOURTH, LOCAL `FAQCategory` with its own spellings, and it was
 * destroying admin-authored data on every save.
 *
 * It read:
 *
 *   type FAQCategory = "general" | "shipping" | "returns" | "payment"
 *                    | "account" | "products" | "sellers";
 *
 * Six of those seven are not values any FAQ document has ever carried — the
 * real ones are `shipping_delivery`, `returns_refunds`, `orders_payment`,
 * `product_information`, `account_security`. So:
 *
 *   - `parseFAQBuilder` filters the stored array against `FAQ_CATEGORY_OPTIONS`,
 *     and the seeded config `["general","orders_payment","shipping_delivery",
 *     "returns_refunds","product_information"]` came back as `["general"]`;
 *   - the admin saw ONE of five boxes ticked on a form that looked complete;
 *   - saving wrote `categories: ["general"]`, PERMANENTLY dropping four;
 *   - and had they ticked "Shipping", the homepage tab would have rendered the
 *     raw lowercase `shipping` as its label and filtered to zero items, because
 *     the renderer compares it against `item.category` (Root Cause #33).
 *
 * Nothing caught it because `buildFAQConfig` returns `JsonObjectWithUndefined`,
 * so the mismatch between this union and `FAQSectionConfig.categories` is
 * laundered through an index signature before `tsc` can see it.
 *
 * Re-exported under the same name so the ~6 references in this module and its
 * build/parse sibling keep working, while the VALUE SET can no longer differ.
 *
 * 🛑 Imported AND re-exported, not `export type { X } from "…"` — that form
 * re-exports without binding the name locally, so the three uses further down
 * this file stopped compiling (`TS2304: Cannot find name 'FAQCategory'`).
 */
import type { FAQCategory } from "../../../faq/types";
export type { FAQCategory };

export interface FAQBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  showOnHomepage: boolean;
  displayCount: number;
  expandedByDefault: boolean;
  linkToFullPage: boolean;
  categories: FAQCategory[];
}

export interface BlogBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  maxArticles: number;
  showReadTime: boolean;
  showAuthor: boolean;
  showThumbnails: boolean;
}

/**
 * `placeholder` / `buttonText` were removed: the subscribe form itself is
 * supplied by the consumer through `newsletterFormSlot`, so appkit has no
 * input or button to apply them to.
 */
export interface NewsletterBuilderState {
  title: string;
  description: string;
  privacyText: string;
  privacyLink: string;
}

export interface CarouselBuilderState {
  title: string;
  height: "viewport" | "tall" | "medium";
  defaultAutoplayDelayMs: number;
  pauseOnHover: boolean;
  showDots: boolean;
  showArrows: boolean;
}

export interface CustomCardsCardBuilderEntry {
  id: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  body: string;
  link: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
  shadowLevel: "none" | "sm" | "md" | "lg";
}

export interface CustomCardsBuilderState {
  title: string;
  layout: "grid" | "row" | "masonry";
  columns: 1 | 2 | 3 | 4;
  autoScroll: boolean;
  scrollIntervalMs: number;
  loop: boolean;
  cards: CustomCardsCardBuilderEntry[];
}

export interface GoogleReviewsBuilderState {
  placeId: string;
  maxReviews: number;
  minRating: number;
  layout: "grid" | "carousel";
  showRating: boolean;
  showDate: boolean;
  linkToGoogleMaps: boolean;
  googleMapsUrl: string;
}

/**
 * `storeId` / `categorySlug` / `sortBy` were removed: bundles arrive
 * pre-fetched from `listFeaturedBundles(8)`, which takes no scope or sort
 * argument, so none of the three could ever affect the rendered list.
 */
export interface FeaturedBundlesBuilderState {
  title: string;
  /** Overrides the generic "View all →" link label. */
  viewMoreLabel: string;
  subtitle: string;
  maxItems: number;
  showSavingsBadge: boolean;
}

export interface RandomLotsBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  storeId: string;
  revealStatus: "pending" | "open" | "all";
  showCountdown: boolean;
  showEntriesRemaining: boolean;
}

export interface EventRafflesBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  /** 🛑 `EventType` values, not `RaffleType` — see `EventGiveawaysSection`. */
  raffleType: "giveaway" | "bonus-spin" | "all";
  showEntryCount: boolean;
  showCountdown: boolean;
}

export type CollectionCardEntryType =
  | "products"
  | "collector-drops"
  | "pre-orders"
  | "stores"
  | "events"
  | "blog-posts"
  | "reviews"
  | "brands"
  | "categories";

export interface CollectionCardsEntryBuilderState {
  type: CollectionCardEntryType;
  label: string;
  limit: number;
  storeId: string;
  categorySlug: string;
  brandSlug: string;
  featuredOnly: boolean;
}

export interface CollectionCardsBuilderState {
  title: string;
  subtitle: string;
  layout: "carousel" | "grid" | "mixed-row";
  itemsPerRow: 3 | 4 | 5;
  maxItems: number;
  showCollectionTabs: boolean;
  collections: CollectionCardsEntryBuilderState[];
}

export const DEFAULT_PRODUCTS_BUILDER: ProductsBuilderState = {
  title: "Featured Products",
  viewMoreLabel: "",
  subtitle: "",
  maxItems: 18,
  status: "published",
  sortBy: "featured",
  featuredOnly: true,
  inStockOnly: true,
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
  filterByCategory: "",
  maxCount: 10,
  loop: true,
};

export const DEFAULT_COLLECTOR_DROPS_BUILDER: CollectorDropsBuilderState = {
  title: "Live Collector Drops",
  viewMoreLabel: "",
  subtitle: "",
  maxItems: 18,
  status: "active",
  sortBy: "latest",
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
  filterByCategory: "",
  maxCount: 10,
  loop: true,
};

const DEFAULT_STAT_ROW = {
  source: "static" as StatsStatSource,
  metric: "",
  collection: "",
  filterField: "",
  filterValue: "",
  suffix: "",
};

export const DEFAULT_STATS_BUILDER: StatsBuilderState = {
  title: "Marketplace Stats",
  stats: [
    { ...DEFAULT_STAT_ROW, key: "products", label: "Products Listed",  value: "10,000+", source: "live-preset", metric: "total_listings", suffix: "+" },
    { ...DEFAULT_STAT_ROW, key: "sellers",  label: LABEL_VERIFIED_SELLERS, value: "2,000+",  source: "live-preset", metric: "verified_sellers", suffix: "+" },
    { ...DEFAULT_STAT_ROW, key: "buyers",   label: "Happy Buyers",     value: "50,000+", source: "live-preset", metric: "total_buyers", suffix: "+" },
    { ...DEFAULT_STAT_ROW, key: "rating",   label: "Average Rating",   value: "4.8/5",   source: "live-preset", metric: "platform_rating" },
  ],
};

export const DEFAULT_PRE_ORDERS_BUILDER: PreOrdersBuilderState = {
  title: "Reserve Before It Ships",
  viewMoreLabel: "",
  subtitle: "",
  maxItems: 18,
  status: "active",
  sortBy: "latest",
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
  filterByCategory: "",
  maxCount: 10,
  loop: true,
};

export const DEFAULT_STORES_BUILDER: StoresBuilderState = {
  title: "Featured Stores",
  viewMoreLabel: "",
  subtitle: "",
  maxItems: 8,
  status: "active",
  sortBy: "popular",
  verifiedOnly: true,
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
  filterByCategory: "",
  maxCount: 10,
  loop: true,
};

export const DEFAULT_EVENTS_BUILDER: EventsBuilderState = {
  title: "Events & Offers",
  viewMoreLabel: "",
  subtitle: "",
  maxItems: 6,
  status: "active",
  sortBy: "latest",
  featuredOnly: false,
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
  filterByCategory: "",
  maxCount: 10,
  loop: true,
};

export const DEFAULT_SOCIAL_FEED_BUILDER: SocialFeedBuilderState = {
  title: "",
  subtitle: "",
  platform: "instagram",
  handle: "",
  postType: "all",
  count: 9,
  layout: "grid",
  showCaption: true,
  showStats: true,
};

export const DEFAULT_WELCOME_BUILDER: WelcomeBuilderState = {
  h1: "India's #1 Collectibles Marketplace",
  subtitle: "Buy, Sell & Collector Drop Pokémon Cards, Hot Wheels, Action Figures and more",
  description: "",
  showCTA: true,
  ctaText: "Shop Now",
  ctaLink: String(ROUTES.PUBLIC.PRODUCTS),
};

export const DEFAULT_TRUST_INDICATORS_BUILDER: TrustIndicatorsBuilderState = {
  title: "Why choose us?",
  indicators: [
    /*
     * 🛑 `icon` holds an IconKey, not an emoji.
     *
     * These shipped "🚚" / "🔒" / "✅" / "↩️", which the component used only as
     * a React key — every tile rendered the same hardcoded ✓ regardless. Now
     * that `resolveTrustIcon` reads the field, an emoji resolves to nothing and
     * the tile would render text-only, so a default that creates a correct
     * section has to carry real keys. See trust-icon-aliases.ts.
     */
    { id: "ti-1", icon: "ship", title: "Free Shipping", description: "On orders above ₹999" },
    { id: "ti-2", icon: "lock", title: "Secure Payment", description: "Protected checkout" },
    { id: "ti-3", icon: "verify", title: LABEL_VERIFIED_SELLERS, description: "Every store is manually verified" },
    { id: "ti-4", icon: "restore", title: "Easy Returns", description: "7-day hassle-free returns" },
  ],
};

export const DEFAULT_CATEGORIES_BUILDER: CategoriesBuilderState = {
  title: "Shop by Category",
  viewMoreLabel: "",
  maxCategories: 8,
  autoScroll: false,
  scrollInterval: 5000,
  loop: true,
};

export const DEFAULT_BRANDS_BUILDER: BrandsBuilderState = {
  title: "Top Brands",
  viewMoreLabel: "",
  subtitle: "",
  maxBrands: 13,
  autoScroll: true,
  scrollInterval: 4000,
  loop: true,
};

export const DEFAULT_BANNER_BUILDER: BannerBuilderState = {
  height: "lg",
  backgroundImage: "",
  backgroundColor: "",
  gradientFrom: "",
  gradientTo: "",
  contentTitle: "",
  contentSubtitle: "",
  contentDescription: "",
  buttons: [],
  clickable: false,
  clickLink: "",
};

export const DEFAULT_FEATURES_BUILDER: FeaturesBuilderState = {
  title: "Platform Features",
  features: ["Free Shipping on ₹999+", "Secure Payments", "Easy Returns", LABEL_VERIFIED_SELLERS],
};

export const DEFAULT_REVIEWS_BUILDER: ReviewsBuilderState = {
  title: "What Collectors Say",
  viewMoreLabel: "",
  maxReviews: 10,
  itemsPerView: 3,
  autoScroll: true,
  scrollInterval: 5000,
  loop: true,
};

export const DEFAULT_WHATSAPP_BUILDER: WhatsAppBuilderState = {
  title: "Join Our Collector Community",
  description: "Connect with 10,000+ collectors on WhatsApp",
  groupLink: "",
  memberCount: 10000,
  benefits: ["Exclusive deals", "First access to rare finds", "Collector tips & guides"],
  buttonText: "Join WhatsApp Group",
  testimonial: "",
};

export const DEFAULT_FAQ_BUILDER: FAQBuilderState = {
  title: "Frequently Asked Questions",
  viewMoreLabel: "",
  subtitle: "",
  showOnHomepage: true,
  displayCount: 5,
  expandedByDefault: false,
  linkToFullPage: true,
  /*
   * 🛑 This read `["general", "shipping", "returns"]`, and two of the three
   * were values no FAQ document has ever carried — so a newly created homepage
   * FAQ section shipped with two tabs that rendered their raw slug as a label
   * and filtered to zero items. `tsc` found this line the moment the shadow
   * union was collapsed, which is the whole reason the fix was a type change
   * rather than a data edit (Root Cause #45).
   */
  categories: ["general", "shipping_delivery", "returns_refunds"],
};

export const DEFAULT_BLOG_BUILDER: BlogBuilderState = {
  title: "From the Blog",
  viewMoreLabel: "",
  maxArticles: 3,
  showReadTime: true,
  showAuthor: true,
  showThumbnails: true,
};

export const DEFAULT_NEWSLETTER_BUILDER: NewsletterBuilderState = {
  title: "Stay in the Loop",
  description: "Get the latest drops, collector drop alerts, and collector news.",
  privacyText: "We respect your privacy. Unsubscribe anytime.",
  privacyLink: String(ROUTES.PUBLIC.PRIVACY),
};

export const DEFAULT_CAROUSEL_BUILDER: CarouselBuilderState = {
  title: "Hero Carousel",
  height: "tall",
  defaultAutoplayDelayMs: 5000,
  pauseOnHover: true,
  showDots: true,
  showArrows: true,
};

export const DEFAULT_CUSTOM_CARDS_BUILDER: CustomCardsBuilderState = {
  title: "",
  layout: "grid",
  columns: 3,
  autoScroll: false,
  scrollIntervalMs: 4000,
  loop: true,
  cards: [],
};

export const DEFAULT_GOOGLE_REVIEWS_BUILDER: GoogleReviewsBuilderState = {
  placeId: "",
  maxReviews: 6,
  minRating: 4,
  layout: "grid",
  showRating: true,
  showDate: true,
  linkToGoogleMaps: true,
  googleMapsUrl: "",
};

export const DEFAULT_FEATURED_BUNDLES_BUILDER: FeaturedBundlesBuilderState = {
  title: "Curated Bundles",
  viewMoreLabel: "",
  subtitle: "Everything you need in one deal",
  maxItems: 8,
  showSavingsBadge: true,
};

export const DEFAULT_RANDOM_LOTS_BUILDER: RandomLotsBuilderState = {
  title: "Prize Draws",
  subtitle: "Enter for a chance to win rare collectibles",
  maxItems: 6,
  storeId: "",
  revealStatus: "all",
  showCountdown: true,
  showEntriesRemaining: true,
};

export const DEFAULT_EVENT_RAFFLES_BUILDER: EventRafflesBuilderState = {
  title: "Live Raffles & Spin Wheels",
  subtitle: "Participate in community events and win prizes",
  maxItems: 4,
  raffleType: "all",
  showEntryCount: true,
  showCountdown: true,
};

export const DEFAULT_COLLECTION_CARDS_BUILDER: CollectionCardsBuilderState = {
  title: "Featured Collections",
  subtitle: "",
  layout: "mixed-row",
  itemsPerRow: 4,
  maxItems: 12,
  showCollectionTabs: false,
  collections: [
    { type: "products", label: "", limit: 4, storeId: "", categorySlug: "", brandSlug: "", featuredOnly: true },
  ],
};

export const SUPPORTED_TYPED_BUILDERS: SectionType[] = [
  "products",
  "collector-drops",
  "stats",
  "pre-orders",
  "stores",
  "events",
  "social-feed",
  "welcome",
  "trust-indicators",
  "categories",
  "brands",
  "banner",
  "features",
  "reviews",
  "whatsapp-community",
  "faq",
  "blog-articles",
  "newsletter",
  "carousel",
  "custom-cards",
  "google-reviews",
  "featured-bundles",
  "random-lots",
  "event-raffles",
  "collection-cards",
];

export const RESOURCE_SORT_OPTIONS = [
  { label: "Latest", value: "latest" },
  { label: "Oldest", value: "oldest" },
  { label: "Price: Low to High", value: "priceLow" },
  { label: "Price: High to Low", value: "priceHigh" },
  { label: "Featured", value: "featured" },
  { label: "On Sale", value: "onSale" },
  { label: "Popular", value: "popular" },
] as const;

/**
 * 🛑 DERIVED, never hand-written — and `parseFAQBuilder` filters stored values
 * against this list, so a missing entry is not a cosmetic gap: it silently
 * DROPS that category on the admin's next save.
 *
 * `FAQ_CATEGORY_LABELS` is a `Record<FAQCategory, string>`, so a tenth
 * category is a compile error there and appears here with no edit. The seven
 * hand-typed entries this replaced had six wrong spellings and were missing
 * `scam_awareness` and `fees_and_taxes` — see the `FAQCategory` re-export
 * above for the full writeup.
 *
 * Order follows the canonical map's own declaration order rather than being
 * re-sorted: the admin picks from a checkbox list, so the order is a display
 * choice, and having one owner of it is worth more than having it alphabetical.
 */
export const FAQ_CATEGORY_OPTIONS: Array<{ label: string; value: FAQCategory }> = (
  Object.entries(FAQ_CATEGORY_LABELS) as Array<[FAQCategory, string]>
).map(([value, label]) => ({ label, value }));
