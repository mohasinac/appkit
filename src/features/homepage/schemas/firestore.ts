/**
 * Homepage Feature Firestore Document Types & Constants
 * Covers: carousel slides, homepage sections
 */

import {
  generateCarouselId,
  generateHomepageSectionId,
} from "../../../utils/id-generators";

// --- Carousel Slides ----------------------------------------------------------

/** Unified background for a slide or card — supports image, video, solid color, or gradient. */
export interface CarouselBackground {
  type: "image" | "video" | "color" | "gradient";
  /** URL for image/video backgrounds */
  url?: string;
  /** Mobile-optimised URL (image/video) */
  mobileUrl?: string;
  /** Poster frame URL for video backgrounds */
  thumbnail?: string;
  /** Hex/token value for solid-color backgrounds */
  color?: string;
  /** Gradient start color (token or hex) */
  gradientFrom?: string;
  /** Gradient end color (token or hex) */
  gradientTo?: string;
  /** Gradient angle in degrees (0–360) */
  gradientAngle?: number;
  /** Dim overlay drawn on top of image/video */
  dimOverlay?: { enabled: boolean; opacity: number };
}

export type CarouselSlideHeight = "viewport" | "tall" | "medium";
export type CarouselHoverEffect = "scale" | "color" | "glow" | "none";

/** A content card placed in one of 6 grid zones (2 rows × 3 cols). */
export interface CarouselCard {
  id: string;
  /** Zone 1–6: row 1 = zones 1–3, row 2 = zones 4–6 */
  zone: 1 | 2 | 3 | 4 | 5 | 6;
  /** On mobile, collapse to row-1 centre (zone 2) or row-2 centre (zone 5) */
  mobileZone?: 2 | 5;
  background: CarouselBackground;
  content?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    textColor?: string;
    textAlign?: "left" | "center" | "right";
  };
  buttons?: Array<{
    id?: string;
    text: string;
    href: string;
    variant: "primary" | "secondary" | "outline" | "ghost" | "link";
    openInNewTab?: boolean;
  }>;
  hover?: {
    effect: CarouselHoverEffect;
    scaleValue?: number;
    colorValue?: string;
  };
  isButtonOnly?: boolean;
  /** Legacy — kept for backward compat; use `zone` instead */
  gridRow?: 1 | 2;
  /** Legacy — kept for backward compat; use `zone` instead */
  gridCol?: 1 | 2 | 3;
}

/** @deprecated Use CarouselCard. This alias is kept for backward compatibility. */
export type GridCard = CarouselCard;
export type GridCardCreateInput = Omit<CarouselCard, "id">;

export interface CarouselSlideDocument {
  id: string;
  title: string;
  order: number;
  active: boolean;
  /** New unified background field (CF1). */
  background?: CarouselBackground;
  /** @deprecated Use `background`. Kept for backward compat — component falls back gracefully. */
  media?: {
    type: "image" | "video";
    url: string;
    alt?: string;
    thumbnail?: string;
  };
  link?: {
    url: string;
    openInNewTab: boolean;
  };
  /** @deprecated Use `background.mobileUrl`. Kept for backward compat. */
  mobileMedia?: {
    type: "image" | "video";
    url: string;
    alt?: string;
  };
  cards: CarouselCard[];
  overlay?: {
    enabled?: boolean;
    color?: string;
    opacity?: number;
    title?: string;
    subtitle?: string;
    description?: string;
    button?: {
      id?: string;
      text: string;
      link: string;
      variant: "primary" | "secondary" | "outline";
      openInNewTab: boolean;
    };
  };
  settings?: {
    autoplayDelayMs?: number;
    height?: CarouselSlideHeight;
  };
  analytics?: {
    views: number;
    lastViewed?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export const CAROUSEL_SLIDES_COLLECTION = "carouselSlides" as const;
export const CAROUSEL_SLIDES_INDEXED_FIELDS = [
  "active",
  "order",
  "createdBy",
  "createdAt",
] as const;
export const MAX_ACTIVE_SLIDES = 5 as const;
export const GRID_CONFIG = { rows: 2, cols: 3 } as const;
export const DEFAULT_CAROUSEL_SLIDE_DATA: Partial<CarouselSlideDocument> = {
  active: false,
  order: 0,
  cards: [],
};

export const CAROUSEL_SLIDES_PUBLIC_FIELDS = [
  "id",
  "title",
  "order",
  "active",
  "background",
  "media",
  "link",
  "mobileMedia",
  "cards",
  "overlay",
  "settings",
] as const;

export type CarouselSlideCreateInput = Omit<
  CarouselSlideDocument,
  "id" | "createdAt" | "updatedAt"
>;
export type CarouselSlideUpdateInput = Partial<
  Pick<
    CarouselSlideDocument,
    | "title"
    | "order"
    | "active"
    | "background"
    | "media"
    | "link"
    | "mobileMedia"
    | "cards"
    | "overlay"
    | "settings"
  >
>;

export const carouselSlideQueryHelpers = {
  active: () => ["active", "==", true] as const,
  inactive: () => ["active", "==", false] as const,
  byCreator: (userId: string) => ["createdBy", "==", userId] as const,
} as const;

export function createCarouselId(title: string): string {
  return generateCarouselId({ title });
}

export function isValidGridPosition(gridRow: number, gridCol: number): boolean {
  return (
    gridRow >= 1 &&
    gridRow <= GRID_CONFIG.rows &&
    gridCol >= 1 &&
    gridCol <= GRID_CONFIG.cols
  );
}

export function canActivateSlide(currentActiveCount: number): boolean {
  return currentActiveCount < MAX_ACTIVE_SLIDES;
}

// --- Homepage Sections --------------------------------------------------------

/** Config for the hero carousel section — references the carouselSlides collection. */
export interface CarouselSectionConfig {
  title?: string;
  height?: CarouselSlideHeight;
  defaultAutoplayDelayMs?: number;
  pauseOnHover?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
}

export interface WelcomeSectionConfig {
  h1: string;
  subtitle: string;
  description: string;
  showCTA: boolean;
  ctaText?: string;
  ctaLink?: string;
}

export interface TrustIndicatorsSectionConfig {
  title: string;
  indicators: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface CategoriesSectionConfig {
  title: string;
  maxCategories: 4;
  autoScroll: boolean;
  scrollInterval: number;
}

export interface BrandsSectionConfig {
  title: string;
  subtitle?: string;
  maxBrands: number;
  autoScroll: boolean;
  scrollInterval: number;
}

export interface ProductsSectionConfig {
  title: string;
  subtitle?: string;
  maxProducts: 18;
  rows: 2;
  itemsPerRow: 3;
  mobileItemsPerRow: 1;
  autoScroll: boolean;
  scrollInterval: number;
  filterByBrand?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular";
  filterByCategory?: string;
  maxCount?: 5 | 10 | 20;
  loop?: boolean;
}

/**
 * Preset metrics the homepage stats section resolves live from Firestore.
 * Each string corresponds to a repository query in live-stats.ts.
 */
export type LiveStatPreset =
  | "total_listings"     // all products (standard + auction + pre-order)
  | "verified_sellers"   // total stores
  | "total_buyers"       // users with role "user"
  | "platform_rating"    // average rating across all approved reviews
  | "total_orders"       // all orders
  | "total_reviews";     // all approved reviews

/**
 * A custom Firestore collection count query used when source is "live-collection".
 * The collection must be in ALLOWED_LIVE_COLLECTIONS to prevent arbitrary access.
 */
export interface CollectionQueryMetric {
  type: "collection-query";
  collection: string;
  filterField?: string;
  filterValue?: string | number | boolean;
  suffix?: string;
}

/** @deprecated Alias kept for backward compatibility — use LiveStatPreset. */
export type LiveStatMetric = LiveStatPreset;

/** Collections that may be queried via CollectionQueryMetric on the homepage. */
export const ALLOWED_LIVE_COLLECTIONS = [
  "products",
  "stores",
  "users",
  "reviews",
  "orders",
  "events",
  "bids",
] as const;

export type AllowedLiveCollection = (typeof ALLOWED_LIVE_COLLECTIONS)[number];

export interface StatsSectionConfig {
  title?: string;
  stats: Array<{
    key: string;
    label: string;
    /** Fallback value shown when source is "static" or when a live fetch fails. */
    value: string;
    /**
     * "static"      — use value as-is (no Firestore query).
     * "live" / "live-preset" — query a preset Firestore metric; specify metric.
     * "live-collection"      — run a custom collection count query; specify collectionQuery.
     */
    source?: "static" | "live" | "live-preset" | "live-collection";
    /** Which preset metric to fetch when source is "live" or "live-preset". */
    metric?: LiveStatPreset;
    /** Custom collection query when source is "live-collection". */
    collectionQuery?: CollectionQueryMetric;
    /** Optional suffix appended after the live value (e.g. "★", "+"). */
    suffix?: string;
  }>;
}

export interface AuctionsSectionConfig {
  title: string;
  subtitle?: string;
  maxAuctions: 18;
  rows: 2;
  itemsPerRow: 3;
  mobileItemsPerRow: 1;
  autoScroll: boolean;
  scrollInterval: number;
  filterByBrand?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular";
  filterByCategory?: string;
  maxCount?: 5 | 10 | 20;
  loop?: boolean;
}

export interface ReviewsSectionConfig {
  title: string;
  maxReviews: 18;
  itemsPerView: 3;
  mobileItemsPerView: 1;
  autoScroll: boolean;
  scrollInterval: number;
  source?: "platform" | "google";
  placeId?: string;
}

export interface WhatsAppCommunitySectionConfig {
  title: string;
  description: string;
  groupLink: string;
  memberCount?: number;
  benefits: string[];
  buttonText: string;
  testimonial?: string;
}

export interface FeaturesSectionConfig {
  title: string;
  features: string[];
}

export type FAQCategoryKey =
  | "general"
  | "orders_payment"
  | "shipping_delivery"
  | "returns_refunds"
  | "product_information"
  | "account_security"
  | "technical_support";

export interface FAQSectionConfig {
  title: string;
  subtitle?: string;
  showOnHomepage: boolean;
  displayCount: number;
  /** When true, render a tab bar so visitors can filter by category. */
  showCategoryTabs: boolean;
  /** Which category tabs to surface (in display order). Empty = all categories that have items. */
  visibleTabs: FAQCategoryKey[];
  /** Allow multiple accordions to be open simultaneously. */
  allowMultipleOpen: boolean;
  /** Number of items to expand on initial render. 0 = none open. */
  defaultOpenCount: number;
  linkToFullPage: boolean;
  /** Which FAQ categories to pull items from for this section. */
  categories: FAQCategoryKey[];
}

export interface BlogArticlesSectionConfig {
  title: string;
  maxArticles: 4;
  showReadTime: boolean;
  showAuthor: boolean;
  showThumbnails: boolean;
}

export interface NewsletterSectionConfig {
  title: string;
  description: string;
  placeholder: string;
  buttonText: string;
  privacyText: string;
  privacyLink: string;
}

export interface StoresSectionConfig {
  title: string;
  subtitle?: string;
  maxStores: number;
  autoScroll: boolean;
  scrollInterval: number;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular";
  filterByCategory?: string;
  maxCount?: 5 | 10 | 20;
  loop?: boolean;
}

export interface EventsSectionConfig {
  title: string;
  subtitle?: string;
  maxEvents: number;
  autoScroll: boolean;
  scrollInterval: number;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular";
  filterByCategory?: string;
  maxCount?: 5 | 10 | 20;
  loop?: boolean;
}

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "deviantart";
export type SocialPostType = "all" | "images" | "videos" | "reels";
export type SocialFeedLayout = "grid" | "masonry" | "carousel";

export interface SocialFeedSectionConfig {
  title: string;
  subtitle?: string;
  platform: SocialPlatform;
  /** Username, page ID, or handle for the platform account */
  handle: string;
  postType: SocialPostType;
  /** Number of posts to display (4–12) */
  count: number;
  layout: SocialFeedLayout;
  showCaption: boolean;
  showStats: boolean;
}

/** Normalised social post returned by /api/social-feed */
export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  imageUrl: string;
  videoThumbnailUrl?: string;
  caption?: string;
  permalink: string;
  mediaType: "image" | "video" | "carousel";
  stats: {
    likes?: number;
    views?: number;
    comments?: number;
  };
  publishedAt: string;
}

export interface PreOrdersSectionConfig {
  title: string;
  subtitle?: string;
  maxItems: number;
  rows: 2;
  itemsPerRow: 3;
  mobileItemsPerRow: 1;
  autoScroll: boolean;
  scrollInterval: number;
  filterByBrand?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular";
  filterByCategory?: string;
  maxCount?: 5 | 10 | 20;
  loop?: boolean;
}

export interface BannerSectionConfig {
  height: "sm" | "md" | "lg" | "xl";
  backgroundImage?: string;
  backgroundColor?: string;
  gradient?: string;
  content: { title: string; subtitle?: string; description?: string };
  buttons: Array<{
    text: string;
    link: string;
    variant: "primary" | "secondary" | "outline";
  }>;
  clickable: boolean;
  clickLink?: string;
}

export interface CustomCardsCard {
  id: string;
  image?: string;
  imageAlt?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  buttons?: Array<{
    label: string;
    href: string;
    variant: "primary" | "secondary" | "outline" | "ghost";
    target?: "_blank" | "_self";
  }>;
  formEmbed?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  shadowLevel?: "none" | "sm" | "md" | "lg";
}

export interface CustomCardsSectionConfig {
  title?: string;
  layout: "grid" | "row" | "masonry";
  columns?: 1 | 2 | 3 | 4;
  cards: CustomCardsCard[];
  autoScroll?: boolean;
  scrollIntervalMs?: number;
}

export interface GoogleReviewsSectionConfig {
  placeId: string;
  maxReviews?: number;
  minRating?: number;
  layout?: "grid" | "carousel";
  showRating?: boolean;
  showDate?: boolean;
  linkToGoogleMaps?: boolean;
  googleMapsUrl?: string;
}

export type SectionType =
  | "welcome"
  | "carousel"
  | "stats"
  | "trust-indicators"
  | "categories"
  | "brands"
  | "products"
  | "pre-orders"
  | "auctions"
  | "banner"
  | "features"
  | "reviews"
  | "whatsapp-community"
  | "faq"
  | "blog-articles"
  | "newsletter"
  | "stores"
  | "events"
  | "social-feed"
  | "custom-cards"
  | "google-reviews";

export type SectionConfig =
  | CarouselSectionConfig
  | WelcomeSectionConfig
  | StatsSectionConfig
  | TrustIndicatorsSectionConfig
  | CategoriesSectionConfig
  | BrandsSectionConfig
  | ProductsSectionConfig
  | PreOrdersSectionConfig
  | AuctionsSectionConfig
  | BannerSectionConfig
  | FeaturesSectionConfig
  | ReviewsSectionConfig
  | WhatsAppCommunitySectionConfig
  | FAQSectionConfig
  | BlogArticlesSectionConfig
  | NewsletterSectionConfig
  | StoresSectionConfig
  | EventsSectionConfig
  | SocialFeedSectionConfig
  | CustomCardsSectionConfig
  | GoogleReviewsSectionConfig;

export interface HomepageSectionDocument {
  id: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  config: SectionConfig;
  createdAt: Date;
  updatedAt: Date;
}

export const HOMEPAGE_SECTIONS_COLLECTION = "homepageSections" as const;
export const HOMEPAGE_SECTIONS_INDEXED_FIELDS = [
  "enabled",
  "order",
  "type",
] as const;

export const DEFAULT_SECTION_ORDER: Record<SectionType, number> = {
  welcome: 1,
  carousel: 2,
  stats: 3,
  "trust-indicators": 3,
  categories: 2,
  brands: 2,
  products: 4,
  "pre-orders": 5,
  auctions: 6,
  banner: 4,
  features: 7,
  reviews: 8,
  "whatsapp-community": 8,
  faq: 4,
  "blog-articles": 9,
  newsletter: 9,
  stores: 10,
  events: 11,
  "social-feed": 12,
  "custom-cards": 13,
  "google-reviews": 14,
};

export const BANNER_HEIGHTS: Record<BannerSectionConfig["height"], string> = {
  sm: "200px",
  md: "300px",
  lg: "400px",
  xl: "500px",
};

export type HomepageSectionCreateInput = Omit<
  HomepageSectionDocument,
  "id" | "createdAt" | "updatedAt"
>;
export type HomepageSectionUpdateInput = Partial<
  Pick<HomepageSectionDocument, "order" | "enabled" | "config">
>;

export const homepageSectionQueryHelpers = {
  enabled: () => ["enabled", "==", true] as const,
  byType: (type: SectionType) => ["type", "==", type] as const,
} as const;

export function createHomepageSectionId(type: SectionType): string {
  return generateHomepageSectionId({ type });
}
