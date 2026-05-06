export type HomepageSectionType =
  | "hero"
  | "featured_categories"
  | "featured_products"
  | "banner"
  | "testimonials"
  | "promotions"
  | "blog_posts"
  | "sellers"
  | "custom";

export interface HomepageSectionContent {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  itemIds?: string[];
  html?: string;
}

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title?: string;
  /** Primary enable/disable flag stored in Firestore as `enabled` */
  enabled?: boolean;
  /** Alias kept for older consumers */
  isVisible?: boolean;
  order?: number;
  content?: HomepageSectionContent;
  mobile?: Partial<HomepageSectionContent>;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomepageData {
  sections: HomepageSection[];
}

// --- CharacterHotspot --------------------------------------------------------

export interface HotspotPin {
  id: string;
  name: string;
  universe: string;
  description: string;
  href: string;
  /** Percentage from left edge, 0–100 */
  xPct: number;
  /** Percentage from top edge, 0–100 */
  yPct: number;
  /** Hex accent colour for popup header/button */
  accent: string;
  /** Small label on pin (optional) */
  badge?: string;
  /** CTA button label */
  buyText: string;
}

export interface CharacterHotspotConfig {
  imageUrl: string;
  imageAlt: string;
  active: boolean;
  pins: HotspotPin[];
  updatedAt?: string;
}

// --- Hero Banner -------------------------------------------------------------

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
  sortOrder: number;
  active: boolean;
}

// --- Promo Grid --------------------------------------------------------------

export interface PromoBanner {
  id: string;
  title: string;
  ctaLabel: string;
  ctaUrl: string;
  image: string;
  sortOrder: number;
  active: boolean;
}

// --- Trust Badges ------------------------------------------------------------

export type TrustBadgeIconKey = "shipping" | "support" | "rewards" | "secure";

export interface TrustBadge {
  id: string;
  title: string;
  sub: string;
  iconKey: TrustBadgeIconKey;
  sortOrder: number;
  active: boolean;
}

// --- Testimonials -------------------------------------------------------------

export interface Testimonial {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  avatarUrl?: string;
  featured: boolean;
  sortOrder: number;
  active: boolean;
}

// --- Before / After Gallery ---------------------------------------------------

export interface BeforeAfterItem {
  id: string;
  beforeImage: string;
  afterImage: string;
  productId?: string;
  caption: string;
  sortOrder: number;
}

// --- Carousel Slide -----------------------------------------------------------

export type CarouselSlideHeight = "viewport" | "tall" | "medium";
export type CarouselHoverEffect = "scale" | "color" | "glow" | "none";

/** Unified background for a slide or a card. */
export interface CarouselBackground {
  type: "image" | "video" | "color" | "gradient";
  url?: string;
  mobileUrl?: string;
  thumbnail?: string;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  dimOverlay?: { enabled: boolean; opacity: number };
}

export interface CarouselSlideCard {
  id: string;
  /** Zone 1–6: row 1 = zones 1–3, row 2 = zones 4–6. */
  zone: 1 | 2 | 3 | 4 | 5 | 6;
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
  /** @deprecated Use zone. */
  gridRow?: 1 | 2;
  /** @deprecated Use zone. */
  gridCol?: 1 | 2 | 3;
}

export interface CarouselSlide {
  id: string;
  title: string;
  order: number;
  active: boolean;
  background?: CarouselBackground;
  /** @deprecated Use background. Kept for backward compat. */
  media?: { type: "image" | "video"; url: string; alt?: string; thumbnail?: string };
  link?: { url: string; openInNewTab: boolean };
  /** @deprecated Use background.mobileUrl. Kept for backward compat. */
  mobileMedia?: { type: "image" | "video"; url: string; alt?: string };
  cards: CarouselSlideCard[];
  overlay?: {
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
  createdAt?: string;
  updatedAt?: string;
}
