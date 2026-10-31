/**
 * Homepage Feature Firestore Document Types & Constants
 * Covers: homepage sections (incl. the hero carousel's LAYOUT config)
 *
 * 🛑 There is no more carousel SLIDE document here (removed 2026-10-31). The
 * hero rail has no standalone Firestore collection any more — every slide is
 * one event with `showOnCarousel: true`, computed live by
 * `getHeroCarouselSlides()` (`_internal/server/features/events/data.ts`). See
 * CLAUDE.md "Homepage Hero Carousel". `CarouselSectionConfig` below is the
 * one survivor: it is layout only (title/height/autoplay/dots/arrows) and was
 * always independent of slide content.
 */

import {
  generateHomepageSectionId,
} from "../../../utils/id-generators";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
/* The ONE FAQ-category union. See `FAQCategoryKey` below for why this import
 * replaced a local copy. Type-only, so it adds nothing to the import graph. */
import type { FAQCategory } from "../../faq/types";
/* Type-only, so this is erased at compile and adds no runtime import edge. The
   icon fields below must be a closed union or a typo is a silent blank — which
   is exactly the state `renderIcon` left these sections in. */
import type { IconKey } from "../../../ui/icons/icon-registry";

export type CarouselSlideHeight = "viewport" | "tall" | "medium";

// --- Homepage Sections --------------------------------------------------------

/**
 * Config for the hero carousel SECTION — title/height/autoplay/dots/arrows.
 * Slide CONTENT is a separate concern entirely: see the file-header note.
 */
export interface CarouselSectionConfig {
  /** Accessible name for the carousel region. Not rendered as visible copy. */
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
  /** Small eyebrow pill above the headline. Defaults to a generic label. */
  pillLabel?: string;
  /** Secondary CTA beside the primary one. */
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  // `background` was REMOVED here and on the categories/stores/events configs.
  // A repo-wide grep found no renderer reading any of them — four controls in
  // the admin builder that had never affected a pixel.
}

export type TrustIndicator = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export interface TrustIndicatorsSectionConfig {
  title: string;
  indicators: TrustIndicator[];
}

export interface SectionCTA {
  label: string;
  href: string;
  variant: "outline" | "filled" | "text";
}

export interface CategoriesSectionConfig {
  title: string;
  /** Cards to render. Was pinned to the literal `4`; widened so the cap is real. */
  maxCategories?: number;
  autoScroll: boolean;
  scrollInterval: number;
  /** Circular auto-rotate at the carousel edges. Default: true. */
  loop?: boolean;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  /** Optional CTA button rendered below the scroller. */
  cta?: SectionCTA;
  /** Optional client-side filter chips above the scroller. */
  filters?: {
    featuredOnly?: boolean;
    rootOnly?: boolean;
    rootCategoryId?: string;
  };
  // `background` was REMOVED — no renderer has ever read it.
}

export interface BrandsSectionConfig {
  title: string;
  subtitle?: string;
  maxBrands: number;
  autoScroll: boolean;
  scrollInterval: number;
  /** Circular auto-rotate at the carousel edges. Default: true. */
  loop?: boolean;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  /** Optional CTA button rendered below the scroller. */
  cta?: SectionCTA;
  /** Optional client-side filter chips above the scroller. */
  filters?: {
    featuredOnly?: boolean;
    byCountry?: string;
  };
}

export type SectionPagination = "load-more" | "arrows" | "auto-scroll";

/*
 * 🛑 The fields marked NO-RENDERER below reach no component prop. They are
 * kept because the admin builder still writes them and because honouring them
 * needs work outside this schema, but nothing renders them today — treat every
 * one as a control that does nothing until that work lands.
 *
 * `sortBy` / `filterByCategory` / `maxCount` all need the SSR fetch to accept
 * a scope, and `MarketplaceHomepageView` deliberately runs ONE shared
 * `getFeaturedProducts(12)` for every products section: fanning out per
 * section would breach the ~3-round-trip budget in Rule #6.
 *
 * `itemsPerRow` / `mobileItemsPerRow` / `pagination` need `SectionCarousel` to
 * take a caller-supplied `perView` instead of the shared preset.
 */
export interface ProductsSectionConfig {
  title: string;
  subtitle?: string;
  /** @deprecated Legacy name the admin builder writes; prefer `maxItems`. */
  maxProducts?: number;
  /** Number of display rows (1–4). Each row shows itemsPerRow cards. Default: 1. */
  rows?: number;
  itemsPerRow?: number; // NO-RENDERER: SectionCarousel uses a fixed perView preset
  mobileItemsPerRow?: number; // NO-RENDERER: as above
  /** Maximum total items to show (5–20). Default: rows * 5. */
  maxItems?: number;
  /** Pagination mode for multi-row display. */
  pagination?: SectionPagination; // NO-RENDERER: SectionCarousel has no pagination mode
  autoScroll: boolean;
  scrollInterval: number;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  filterByBrand?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular"; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  filterByCategory?: string; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  maxCount?: 5 | 10 | 20; // NO-RENDERER: superseded by the per-section max* field
  loop?: boolean;
}

/**
 * Preset metrics the homepage stats section resolves live from Firestore.
 * Each string corresponds to a repository query in live-stats.ts.
 */
export type LiveStatPreset =
  | "total_listings"     // all products (standard + collector drop + pre-order)
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
    /**
     * Registry icon key. Only needed for a `source: "static"` stat — a live
     * one derives its glyph from `metric` via STAT_PRESET_ICON, because the
     * preset already says what the number measures.
     */
    iconName?: IconKey;
  }>;
}

/**
 * The count fields here were declared as LITERAL types (`maxCollectorDrops: 18`,
 * `rows: 2`, …), which made them unconfigurable by construction — an admin
 * setting 12 was a type error, and the pre-order config already contradicted
 * its own literals in the seed. They are plain optional numbers now that the
 * renderer actually forwards them.
 */
export interface CollectorDropsSectionConfig {
  title: string;
  subtitle?: string;
  maxCollectorDrops?: number;
  rows?: number;
  itemsPerRow?: number; // NO-RENDERER: SectionCarousel uses a fixed perView preset
  mobileItemsPerRow?: number; // NO-RENDERER: SectionCarousel uses a fixed perView preset
  autoScroll: boolean;
  scrollInterval: number;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  filterByBrand?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular"; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  filterByCategory?: string; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  maxCount?: 5 | 10 | 20; // NO-RENDERER: superseded by the per-section max* field
  loop?: boolean;
}

/**
 * `source` and `placeId` were REMOVED. They implied this section could render
 * Google reviews, which it never could — `HomepageCustomerReviewsSection` only
 * ever calls `useHomepageReviews()`. The `google-reviews` section type is the
 * real surface for that, and it has its own config with a required `placeId`.
 */
export interface ReviewsSectionConfig {
  title: string;
  maxReviews?: number;
  itemsPerView?: number;
  mobileItemsPerView?: number;
  autoScroll: boolean;
  scrollInterval: number;
  /** Circular auto-rotate at the carousel edges. Default: true. */
  loop?: boolean;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
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

export interface FeatureItem {
  key: string;
  title: string;
  description: string;
  /**
   * Registry icon key. Optional because the renderer falls back to resolving
   * `key` through `resolveTrustIcon` — the seeded items carry intent slugs
   * (`escrow`, `scam-registry`, `encrypted-data`) that already map to a glyph,
   * so existing documents get icons without being rewritten.
   */
  iconName?: IconKey;
}

/**
 * `features: string[]` could never reach `SecurityHighlightsSection`, which
 * needs `{key, title, description}` cards — so the renderer silently fell back
 * to `DEFAULT_SECURITY_ITEMS` and the configured list was dead.
 *
 * `items` is the real shape. `features` is kept readable for back-compat with
 * documents written before this change; when only `features` is present each
 * string becomes a title-only card.
 */
export interface FeaturesSectionConfig {
  title: string;
  items?: FeatureItem[];
  /** @deprecated Use `items`. Title-only cards. */
  features?: string[];
  /** Small eyebrow pill above the heading. */
  pillLabel?: string;
  /** "Learn more" link below the cards. */
  learnMoreLabel?: string;
  learnMoreLink?: string;
}

/**
 * 🛑 An ALIAS, no longer its own union.
 *
 * There were FOUR same-named-or-equivalent FAQ-category unions and they had
 * drifted in two different directions:
 *
 *   1. `FAQCategory`      (features/faq/types)            — 9 values, the REAL one
 *   2. `FAQCategoryKey`   (here)                          — 7, missing scam_awareness + fees_and_taxes
 *   3. `FAQCategory`      (admin/.../adminSectionsTypes)  — 7, DIFFERENT SPELLINGS
 *   4. `FAQ_CATEGORY_LABELS` (homepage/constants)         — 7 keys, loosely typed
 *
 * (2) merely lagged. (3) was a live DATA-DESTROYING defect: its options were
 * `shipping` / `returns` / `payment` / `account` / `products` / `sellers`, so
 * `parseFAQBuilder` filtered every stored value against that list and only
 * `general` survived. An admin opening the homepage FAQ section to change its
 * TITLE saw one of five categories ticked, and saving wrote `["general"]` —
 * permanently dropping the other four, silently, with a form that looked
 * complete. Root Cause #76's write-shape lesson: a form that can only express
 * a subset destroys the rest on every save.
 *
 * Keeping the NAME rather than deleting it: it is referenced by two fields
 * below and by consumer code, and a rename would be churn for no gain. What
 * matters is that it can no longer hold a different value set.
 */
export type FAQCategoryKey = FAQCategory;

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
  /** Label for the "view all FAQs" link. Defaults to a generic one. */
  viewMoreLabel?: string;
}

export interface BlogArticlesSectionConfig {
  title: string;
  /** Was the literal `4`, so the cap could not be changed. */
  maxArticles?: number;
  showReadTime?: boolean;
  showAuthor?: boolean;
  showThumbnails?: boolean;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
}

/**
 * `placeholder` and `buttonText` were REMOVED. The form itself is supplied by
 * the consumer through `MarketplaceHomepageViewProps.newsletterFormSlot` — the
 * section only renders the surrounding band — so appkit has no element to apply
 * them to. They were controls that could never affect anything.
 */
export interface NewsletterSectionConfig {
  title: string;
  description: string;
  privacyText: string;
  privacyLink: string;
}

export interface StoresSectionConfig {
  title: string;
  subtitle?: string;
  maxStores: number;
  autoScroll: boolean;
  scrollInterval: number;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular"; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  filterByCategory?: string; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  maxCount?: 5 | 10 | 20; // NO-RENDERER: superseded by the per-section max* field
  loop?: boolean;
}

export interface EventsSectionConfig {
  title: string;
  subtitle?: string;
  maxEvents: number;
  autoScroll: boolean;
  scrollInterval: number;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular"; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  filterByCategory?: string; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  maxCount?: 5 | 10 | 20; // NO-RENDERER: superseded by the per-section max* field
  loop?: boolean;
}

/**
 * The homepage coupon rail — live discount codes, with a link to `/promotions`.
 *
 * 🛑 THIS REPLACED THE `events` SECTION ON THE HOMEPAGE (2026-10-25, owner's
 * instruction). The events rail advertised five promotions that did not exist:
 * only the Diwali offer was real, and the other four were fabricated fixtures
 * that a previous session had seeded and then promoted to the front page. A
 * coupon is the opposite kind of claim — it is a code the till either honours
 * or refuses, so it cannot be invented.
 *
 * `events` remains a valid `SectionType` and the renderer still handles it;
 * it is the homepage SEED that no longer enables one.
 */
export interface CouponsSectionConfig {
  title: string;
  subtitle?: string;
  /** How many codes to show before the "view all" link takes over. */
  maxCoupons: number;
  /** Label for the link into `/promotions`. */
  viewMoreLabel?: string;
}

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "deviantart" | "youtube";
export type SocialPostType = "all" | "images" | "videos" | "reels";
export type SocialFeedLayout = "grid" | "masonry" | "carousel";

/**
 * A manually configured static social post — used for YouTube videos (no API token needed)
 * and as a fallback when platform credentials are not configured.
 * videoId is stored; thumbnail URL is computed at render time from the video ID.
 * Do NOT store raw YouTube CDN thumbnail URLs in Firestore (they may expire).
 */
export type StaticSocialPost = {
  id: string;
  platform: SocialPlatform;
  /** YouTube video ID (e.g. "dQw4w9WgXcQ"). Required when platform is "youtube". */
  videoId?: string;
  /** YouTube channel display name shown as a chip. */
  channelName?: string;
  caption?: string;
}

export interface SocialFeedSectionConfig {
  title: string;
  subtitle?: string;
  platform: SocialPlatform;
  /** Username, page ID, or handle for the platform account. Optional for YouTube (uses static posts). */
  handle?: string;
  postType: SocialPostType;
  /** Number of posts to display (4–12) */
  count: number;
  layout: SocialFeedLayout;
  showCaption: boolean;
  showStats: boolean;
  /**
   * Manually configured static posts (YouTube videos, etc.).
   * Rendered alongside or instead of platform-fetched posts.
   */
  posts?: StaticSocialPost[];
}

/** Normalised social post returned by /api/social-feed */
export type SocialPost = {
  id: string;
  platform: SocialPlatform;
  imageUrl?: string;
  videoThumbnailUrl?: string;
  /** YouTube video ID — present when platform is "youtube". */
  videoId?: string;
  /** YouTube channel display name. */
  channelName?: string;
  caption?: string;
  permalink: string;
  mediaType: "image" | "video" | "carousel";
  stats: {
    likes?: number;
    views?: number;
    comments?: number;
  };
  publishedAt?: string;
}

export interface PreOrdersSectionConfig {
  title: string;
  subtitle?: string;
  maxItems?: number;
  // Same literal-type problem as the collector drops config — and the seed already
  // contradicted these with itemsPerRow: 4 / mobileItemsPerRow: 2.
  rows?: number;
  itemsPerRow?: number; // NO-RENDERER: SectionCarousel uses a fixed perView preset
  mobileItemsPerRow?: number; // NO-RENDERER: SectionCarousel uses a fixed perView preset
  autoScroll: boolean;
  scrollInterval: number;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
  filterByBrand?: string;
  sortBy?: "latest" | "oldest" | "priceLow" | "priceHigh" | "featured" | "onSale" | "popular"; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  filterByCategory?: string; // NO-RENDERER: SSR uses one shared fetch (Rule #6)
  maxCount?: 5 | 10 | 20; // NO-RENDERER: superseded by the per-section max* field
  loop?: boolean;
}

/**
 * Four fields were REMOVED here:
 *
 * - `backgroundColor` / `gradient`. The band's copy is fixed inverse (white)
 *   ink, so an arbitrary admin-chosen fill has no safe outcome — that is
 *   Root Cause #67 exactly. `backgroundImage` survives because it renders
 *   under a scrim, which guarantees the contrast. The themed `accent-banner`
 *   tone already gives a brand gradient that follows the active theme.
 * - `clickable` / `clickLink`. A link wrapping the whole banner would nest the
 *   two CTA buttons inside an anchor, which is an a11y violation and
 *   ambiguous besides. The buttons are the click target.
 */
export interface BannerSectionConfig {
  height: "sm" | "md" | "lg" | "xl";
  backgroundImage?: string;
  /** `eyebrow` is the small uppercase label above the headline — it replaced a
      hardcoded ✨, which was decoration where one word of context is free. */
  content: { title: string; eyebrow?: string; subtitle?: string; description?: string };
  buttons: Array<{
    text: string;
    link: string;
    variant: "primary" | "secondary" | "outline";
  }>;
}

export type CustomCardsCard = {
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
  /** Circular auto-rotate at the carousel edges. Default: true. */
  loop?: boolean;
}

export type CollectionCardType =
  | "products"
  | "collector-drops"
  | "pre-orders"
  | "stores"
  | "events"
  | "blog-posts"
  | "reviews"
  | "brands"
  | "categories";

export interface CollectionCardsEntry {
  type: CollectionCardType;
  label?: string;
  limit?: number;
  storeId?: string;
  categorySlug?: string;
  brandSlug?: string;
  featuredOnly?: boolean;
}

export interface CollectionCardsSectionConfig {
  title?: string;
  subtitle?: string;
  collections: CollectionCardsEntry[];
  layout?: "carousel" | "grid" | "mixed-row";
  itemsPerRow?: 3 | 4 | 5;
  maxItems?: number;
  showCollectionTabs?: boolean;
  cta?: SectionCTA;
  // `background` was REMOVED — the last of the five section-background fields
  // that no renderer has ever read.
}

export const COLLECTION_CARDS_MAX_ENTRIES = 3 as const;

/**
 * `storeId`, `categorySlug` and `sortBy` were REMOVED. Bundles arrive
 * pre-fetched from `listFeaturedBundles(8)` in `MarketplaceHomepageView`, which
 * takes no scope or sort argument — honouring them means changing that fetch,
 * and a per-section fetch would breach the SSR round-trip budget (Rule #6).
 * `maxItems` survives because slicing an already-fetched list is real.
 */
export interface FeaturedBundlesSectionConfig {
  title?: string;
  subtitle?: string;
  maxItems?: number;
  showSavingsBadge?: boolean;
  /** Label for the "view all" link. Defaults to a generic one. */
  viewMoreLabel?: string;
}

export interface RandomLotsSectionConfig {
  title?: string;
  subtitle?: string;
  maxItems?: number;
  storeId?: string;
  revealStatus?: "pending" | "open" | "all";
  showCountdown?: boolean;
  showEntriesRemaining?: boolean;
}

/**
 * 🛑 Deliberately still named `EventRaffles…` after the 2026-10-31 EventType
 * rename: it is the config for the homepage section whose PERSISTED
 * discriminator is `type: "event-raffles"` (see `homepage-sections-seed-data`
 * and `section-renderer`). The component it feeds was renamed to
 * `EventGiveawaysSection`; this type mirrors the stored value, not the
 * component. Renaming it without migrating that discriminator would leave the
 * name describing something no document holds.
 */
export interface EventRafflesSectionConfig {
  title?: string;
  subtitle?: string;
  maxItems?: number;
  /**
   * Which prize-event types the strip spans. The two concrete values are
   * `EventType` members, matched against the `type` field — see
   * `EventGiveawaysSection` for why `hasRaffle` was the wrong field and what it
   * silently did instead.
   */
  /**
   * 🛑 Holds `EventType` values despite the name — `EventGiveawaysSection`
   * feeds it straight into `sieveFilter(EVENT_FIELDS.TYPE, EQ, ...)`. Renamed
   * 2026-10-31 with the union (`raffle` -> `giveaway`, `spin_wheel` ->
   * `bonus-spin`); the real `RaffleType` axis was NOT renamed. The FIELD name
   * stays — it is persisted inside a `homepageSections` config blob.
   */
  raffleType?: "giveaway" | "bonus-spin" | "all";
  showEntryCount?: boolean; // NO-RENDERER: EventCard has no entry-count prop; adding one touches every EventCard consumer and is its own change.
  showCountdown?: boolean; // NO-RENDERER: EventCard has no countdown prop; same reason as showEntryCount.
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

/**
 * Added 2026-10-19 promoting `HowItWorksSection` out of the orphan set — see
 * `HowItWorksSection.tsx`'s own docstring for why `renderIcon`/`onCtaClick`
 * (function props, not serialisable) became `iconKey`/`ctaLink`. `steps` is
 * inline because the step count/order IS the authored content, same reasoning
 * as `TestimonialsSectionConfig.testimonials` below.
 */
export interface HowItWorksStepConfig {
  number: number;
  title: string;
  desc: string;
  iconKey?: string;
  iconColor?: string;
  iconBg?: string;
  badgeBg?: string;
}

export interface HowItWorksSectionConfig {
  title: string;
  subtitle?: string;
  pillLabel?: string;
  ctaLabel?: string;
  ctaLink?: string;
  steps: HowItWorksStepConfig[];
}

/**
 * Added 2026-10-19 promoting `TestimonialsCarousel` out of the orphan set.
 * Deliberately NOT a read from the `testimonials` collection shape
 * (`Testimonial` in `types/index.ts`) — `featured`/`sortOrder`/`active` are
 * collection-row housekeeping with no meaning inside an already-ordered
 * config array, and `avatarUrl` was declared there and never rendered. No
 * `autoScroll`/`scrollInterval`/`loop` either: the component has no autoplay,
 * arrows or dots — it is not actually a carousel, despite the name.
 */
/** An embedded sub-document with its own `id` — a type alias, not a Firestore collection root, so it does not extend `BaseDocument`. */
export type TestimonialConfigEntry = {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
};

export interface TestimonialsSectionConfig {
  eyebrow?: string;
  heading?: string;
  testimonials: TestimonialConfigEntry[];
}

/**
 * Added 2026-10-19 promoting `PromoGrid` out of the orphan set. `banners` is
 * capped at `PROMO_GRID_MAX_BANNERS` (4) by the component itself — the
 * layout has exactly one hero slot and three regular ones, so a 5th banner
 * is silently dropped, not a bug. No admin background/colour field: the dark
 * theme is intentionally hardcoded (Root Cause #67 — a themed background
 * paired with fixed white ink would invert wrong in a light theme; this
 * component is always dark, by design, so it never pairs the two).
 */
/** An embedded sub-document with its own `id` — a type alias, not a Firestore collection root, so it does not extend `BaseDocument`. */
export type PromoBannerConfigEntry = {
  id: string;
  title: string;
  ctaLabel: string;
  ctaUrl: string;
  image: string;
};

export interface PromoGridSectionConfig {
  eyebrow?: string;
  heading?: string;
  banners: PromoBannerConfigEntry[];
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
  | "collector-drops"
  | "banner"
  | "features"
  | "reviews"
  | "whatsapp-community"
  | "faq"
  | "blog-articles"
  | "newsletter"
  | "stores"
  | "events"
  | "coupons"
  | "social-feed"
  | "custom-cards"
  | "google-reviews"
  | "featured-bundles"
  | "random-lots"
  | "event-raffles"
  | "collection-cards"
  | "how-it-works"
  | "testimonials"
  | "promo-grid";

export type SectionConfig =
  | CarouselSectionConfig
  | WelcomeSectionConfig
  | StatsSectionConfig
  | TrustIndicatorsSectionConfig
  | CategoriesSectionConfig
  | BrandsSectionConfig
  | ProductsSectionConfig
  | PreOrdersSectionConfig
  | CollectorDropsSectionConfig
  | BannerSectionConfig
  | FeaturesSectionConfig
  | ReviewsSectionConfig
  | WhatsAppCommunitySectionConfig
  | FAQSectionConfig
  | BlogArticlesSectionConfig
  | NewsletterSectionConfig
  | StoresSectionConfig
  | EventsSectionConfig
  | CouponsSectionConfig
  | SocialFeedSectionConfig
  | CustomCardsSectionConfig
  | GoogleReviewsSectionConfig
  | FeaturedBundlesSectionConfig
  | RandomLotsSectionConfig
  | EventRafflesSectionConfig
  | CollectionCardsSectionConfig
  /*
   * 🛑 These three were MISSING from this union until 2026-10-20, despite being
   * declared above, registered in `SECTION_REGISTRY`, and offered in the admin
   * create picker.
   *
   * Nothing failed, for two reasons that both deserve naming. The renderer's
   * `config as HowItWorksSectionConfig` casts compiled only by accident —
   * `CarouselSectionConfig` is entirely optional, which makes the union
   * comparable to practically any object type, so the casts were load-bearing
   * luck rather than a checked narrowing. And the gap was invisible because
   * nothing had ever tried to WRITE one: `homepageSectionsSeedData` is typed
   * `config: SectionConfig`, so an object literal carrying `steps` or `banners`
   * fails excess-property checking against every member — i.e. the two sections
   * added in this pass could not be seeded until the union admitted them.
   */
  | HowItWorksSectionConfig
  | TestimonialsSectionConfig
  | PromoGridSectionConfig;

/**
 * Which page a section row belongs to.
 *
 * One collection, one owner per surface. This does NOT reintroduce the
 * `siteSettings.homepageLayout` that `sectionTemplates.ts` deliberately refuses
 * — that note forbids a SECOND owner of the homepage's layout, and this keeps
 * `homepageSections` the single source of truth while letting a category or a
 * brand page own its own ordered list.
 */
export const SECTION_SURFACE_VALUES = [
  "homepage",
  "category",
  "brand",
  "product",
  "store",
] as const;
export type SectionSurface = (typeof SECTION_SURFACE_VALUES)[number];

/** Absent means `"homepage"`. See the field comment below. */
export const DEFAULT_SECTION_SURFACE: SectionSurface = "homepage";

export interface HomepageSectionDocument extends BaseDocument {
  type: SectionType;
  order: number;
  enabled: boolean;
  config: SectionConfig;
  /**
   * 🛑 OPTIONAL, and that is load-bearing. Every other field on this document
   * is required, so a non-optional `surface` would make every one of the 23
   * existing rows fail the type on read. Absent therefore means
   * `DEFAULT_SECTION_SURFACE` — which is also the honest reading of history,
   * since every row written before this existed was a homepage row.
   *
   * 🛑 Filter it IN MEMORY, never as a Firestore clause. The only composite
   * index on this collection is `(enabled, order)`;
   * `where(enabled).where(surface).orderBy(order)` is a three-field composite
   * it does not cover and Firestore throws FAILED_PRECONDITION at RUNTIME, not
   * at build time. `MarketplaceHomepageView` already filters sections in memory
   * for the listing-type gate — follow that precedent. Section counts are tens.
   */
  surface?: SectionSurface;
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
  "collector-drops": 6,
  banner: 4,
  features: 7,
  reviews: 8,
  "whatsapp-community": 8,
  faq: 4,
  "blog-articles": 9,
  newsletter: 9,
  stores: 10,
  events: 11,
  // Takes the events rail's place in the running order — see CouponsSectionConfig.
  coupons: 11,
  "social-feed": 12,
  "custom-cards": 13,
  "google-reviews": 14,
  "featured-bundles": 20,
  "random-lots": 21,
  "event-raffles": 22,
  "collection-cards": 23,
  "how-it-works": 24,
  testimonials: 25,
  "promo-grid": 26,
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
  // `surface` included deliberately: PATCH builds its input from this Pick, so
  // a field missing here is silently dropped by the spread in the route even
  // after the route's own Zod schema accepts it (Root Cause #76).
  Pick<HomepageSectionDocument, "order" | "enabled" | "config" | "surface">
>;

export const homepageSectionQueryHelpers = {
  enabled: () => ["enabled", "==", true] as const,
  byType: (type: SectionType) => ["type", "==", type] as const,
} as const;

/**
 * 🛑 The surface is part of the id, or a category's `products` section collides
 * with the homepage's — same type, same generated slug, one document.
 *
 * `"homepage"` is omitted from the id so every existing row keeps the exact id
 * it already has. A migration here would be a rename of 23 live documents to
 * gain nothing.
 */
export function createHomepageSectionId(
  type: SectionType,
  surface: SectionSurface = DEFAULT_SECTION_SURFACE,
): string {
  const base = generateHomepageSectionId({ type });
  return surface === DEFAULT_SECTION_SURFACE ? base : `${base}-${surface}`;
}
