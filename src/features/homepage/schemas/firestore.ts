/**
 * Homepage Feature Firestore Document Types & Constants
 * Covers: carousel slides, homepage sections
 */

import {
  generateCarouselId,
  generateHomepageSectionId,
} from "../../../utils/id-generators";

// --- Carousel Slides ----------------------------------------------------------

export interface GridCard {
  id: string;
  gridRow: 1 | 2;
  gridCol: 1 | 2 | 3;
  background: {
    type: "color" | "gradient" | "image" | "video";
    value: string;
    overlay?: { enabled: boolean; color: string; opacity: number };
  };
  content?: {
    title?: string;
    subtitle?: string;
    description?: string;
    textColor?: string;
  };
  buttons?: Array<{
    id?: string;
    text: string;
    link: string;
    variant: "primary" | "secondary" | "outline";
    openInNewTab: boolean;
  }>;
  isButtonOnly: boolean;
  sizing?: {
    width?: "auto" | "full" | "1/2" | "1/3" | "2/3";
    height?: "auto" | "full" | "sm" | "md" | "lg";
  };
}

export type GridCardCreateInput = Omit<GridCard, "id">;

export interface CarouselSlideDocument {
  id: string;
  title: string;
  order: number;
  active: boolean;
  media: {
    type: "image" | "video";
    url: string;
    alt?: string;
    thumbnail?: string;
  };
  link?: {
    url: string;
    openInNewTab: boolean;
  };
  mobileMedia?: {
    type: "image" | "video";
    url: string;
    alt?: string;
  };
  cards: GridCard[];
  overlay?: {
    /** Visual overlay — dims the background image */
    enabled?: boolean;
    color?: string;
    opacity?: number;
    /** Content overlay — text and CTA layered over the slide */
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
  "media",
  "link",
  "mobileMedia",
  "cards",
  "overlay",
] as const;

export type CarouselSlideCreateInput = Omit<
  CarouselSlideDocument,
  "id" | "createdAt" | "updatedAt"
>;
export type CarouselSlideUpdateInput = Partial<
  Pick<
    CarouselSlideDocument,
    "title" | "order" | "active" | "media" | "link" | "mobileMedia" | "cards"
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
}

export interface ReviewsSectionConfig {
  title: string;
  maxReviews: 18;
  itemsPerView: 3;
  mobileItemsPerView: 1;
  autoScroll: boolean;
  scrollInterval: number;
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

export interface FAQSectionConfig {
  title: string;
  subtitle?: string;
  showOnHomepage: boolean;
  displayCount: number;
  expandedByDefault: boolean;
  linkToFullPage: boolean;
  categories: Array<
    | "general"
    | "shipping"
    | "returns"
    | "payment"
    | "account"
    | "products"
    | "sellers"
  >;
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
}

export interface EventsSectionConfig {
  title: string;
  subtitle?: string;
  maxEvents: number;
  autoScroll: boolean;
  scrollInterval: number;
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

export type SectionType =
  | "welcome"
  | "trust-indicators"
  | "categories"
  | "brands"
  | "products"
  | "auctions"
  | "banner"
  | "features"
  | "reviews"
  | "whatsapp-community"
  | "faq"
  | "blog-articles"
  | "newsletter"
  | "stores"
  | "events";

export type SectionConfig =
  | WelcomeSectionConfig
  | TrustIndicatorsSectionConfig
  | CategoriesSectionConfig
  | BrandsSectionConfig
  | ProductsSectionConfig
  | AuctionsSectionConfig
  | BannerSectionConfig
  | FeaturesSectionConfig
  | ReviewsSectionConfig
  | WhatsAppCommunitySectionConfig
  | FAQSectionConfig
  | BlogArticlesSectionConfig
  | NewsletterSectionConfig
  | StoresSectionConfig
  | EventsSectionConfig;

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
  "trust-indicators": 3,
  categories: 2,
  brands: 2,
  products: 4,
  auctions: 5,
  banner: 4,
  features: 5,
  reviews: 6,
  "whatsapp-community": 6,
  faq: 4,
  "blog-articles": 5,
  newsletter: 6,
  stores: 7,
  events: 8,
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
