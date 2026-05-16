const LABEL_VERIFIED_SELLERS = "Verified Sellers";

export const SECTION_TYPE_OPTIONS = [
  "welcome",
  "stats",
  "trust-indicators",
  "categories",
  "brands",
  "products",
  "pre-orders",
  "auctions",
  "banner",
  "features",
  "reviews",
  "whatsapp-community",
  "faq",
  "blog-articles",
  "newsletter",
  "stores",
  "events",
  "social-feed",
  "carousel",
  "custom-cards",
  "google-reviews",
  "featured-bundles",
  "prize-draws",
  "event-raffles",
  "collection-cards",
] as const;

export type SectionType = (typeof SECTION_TYPE_OPTIONS)[number];

export interface SectionPatchPayload {
  enabled: boolean;
  order?: number;
  config: Record<string, unknown>;
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

export interface AuctionsBuilderState {
  title: string;
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
  maxCategories: number;
  autoScroll: boolean;
  scrollInterval: number;
}

export interface BrandsBuilderState {
  title: string;
  subtitle: string;
  maxBrands: number;
  autoScroll: boolean;
  scrollInterval: number;
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

export interface ReviewsBuilderState {
  title: string;
  maxReviews: number;
  itemsPerView: number;
  autoScroll: boolean;
  scrollInterval: number;
  source: "platform" | "google";
  placeId: string;
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

export type FAQCategory = "general" | "shipping" | "returns" | "payment" | "account" | "products" | "sellers";

export interface FAQBuilderState {
  title: string;
  subtitle: string;
  showOnHomepage: boolean;
  displayCount: number;
  expandedByDefault: boolean;
  linkToFullPage: boolean;
  categories: FAQCategory[];
}

export interface BlogBuilderState {
  title: string;
  maxArticles: number;
  showReadTime: boolean;
  showAuthor: boolean;
  showThumbnails: boolean;
}

export interface NewsletterBuilderState {
  title: string;
  description: string;
  placeholder: string;
  buttonText: string;
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

export interface FeaturedBundlesBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  storeId: string;
  categorySlug: string;
  sortBy: "newest" | "savings-desc" | "price-asc";
  showSavingsBadge: boolean;
}

export interface PrizeDrawsBuilderState {
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
  raffleType: "raffle" | "spin_wheel" | "all";
  showEntryCount: boolean;
  showCountdown: boolean;
}

export type CollectionCardEntryType =
  | "products"
  | "auctions"
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
  loop: false,
};

export const DEFAULT_AUCTIONS_BUILDER: AuctionsBuilderState = {
  title: "Live Auctions",
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
  loop: false,
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
  loop: false,
};

export const DEFAULT_STORES_BUILDER: StoresBuilderState = {
  title: "Featured Stores",
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
  loop: false,
};

export const DEFAULT_EVENTS_BUILDER: EventsBuilderState = {
  title: "Events & Offers",
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
  loop: false,
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
  subtitle: "Buy, Sell & Auction Pokémon Cards, Hot Wheels, Action Figures and more",
  description: "",
  showCTA: true,
  ctaText: "Shop Now",
  ctaLink: "/products",
};

export const DEFAULT_TRUST_INDICATORS_BUILDER: TrustIndicatorsBuilderState = {
  title: "Why LetItRip?",
  indicators: [
    { id: "ti-1", icon: "🚚", title: "Free Shipping", description: "On orders above ₹999" },
    { id: "ti-2", icon: "🔒", title: "Secure Payment", description: "Razorpay protected checkout" },
    { id: "ti-3", icon: "✅", title: LABEL_VERIFIED_SELLERS, description: "Every store is manually verified" },
    { id: "ti-4", icon: "↩️", title: "Easy Returns", description: "7-day hassle-free returns" },
  ],
};

export const DEFAULT_CATEGORIES_BUILDER: CategoriesBuilderState = {
  title: "Shop by Category",
  maxCategories: 8,
  autoScroll: false,
  scrollInterval: 5000,
};

export const DEFAULT_BRANDS_BUILDER: BrandsBuilderState = {
  title: "Top Brands",
  subtitle: "",
  maxBrands: 13,
  autoScroll: true,
  scrollInterval: 4000,
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
  maxReviews: 10,
  itemsPerView: 3,
  autoScroll: true,
  scrollInterval: 5000,
  source: "platform",
  placeId: "",
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
  subtitle: "",
  showOnHomepage: true,
  displayCount: 5,
  expandedByDefault: false,
  linkToFullPage: true,
  categories: ["general", "shipping", "returns"],
};

export const DEFAULT_BLOG_BUILDER: BlogBuilderState = {
  title: "From the Blog",
  maxArticles: 3,
  showReadTime: true,
  showAuthor: true,
  showThumbnails: true,
};

export const DEFAULT_NEWSLETTER_BUILDER: NewsletterBuilderState = {
  title: "Stay in the Loop",
  description: "Get the latest drops, auction alerts, and collector news.",
  placeholder: "Enter your email",
  buttonText: "Subscribe",
  privacyText: "We respect your privacy. Unsubscribe anytime.",
  privacyLink: "/privacy",
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
  subtitle: "Everything you need in one deal",
  maxItems: 8,
  storeId: "",
  categorySlug: "",
  sortBy: "savings-desc",
  showSavingsBadge: true,
};

export const DEFAULT_PRIZE_DRAWS_BUILDER: PrizeDrawsBuilderState = {
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
  "auctions",
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
  "prize-draws",
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

export const FAQ_CATEGORY_OPTIONS: Array<{ label: string; value: FAQCategory }> = [
  { label: "General", value: "general" },
  { label: "Shipping", value: "shipping" },
  { label: "Returns", value: "returns" },
  { label: "Payment", value: "payment" },
  { label: "Account", value: "account" },
  { label: "Products", value: "products" },
  { label: "Sellers", value: "sellers" },
];
