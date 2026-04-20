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

export interface CarouselSlideCard {
  id: string;
  gridRow: 1 | 2;
  gridCol: 1 | 2 | 3;
  background: {
    type: "color" | "gradient" | "image" | "transparent";
    value: string;
  };
  content?: { title?: string; subtitle?: string; description?: string };
  buttons?: Array<{
    id: string;
    text: string;
    link: string;
    variant: "primary" | "secondary" | "outline";
    openInNewTab: boolean;
  }>;
  isButtonOnly: boolean;
  sizing?: {
    widthPct?: 25 | 50 | 75 | 100;
    heightPct?: 25 | 50 | 75 | 100;
    padding?: "none" | "sm" | "md" | "lg";
  };
}

export interface CarouselSlide {
  id: string;
  title: string;
  order: number;
  active: boolean;
  media: { type: "image" | "video"; url: string; alt: string; thumbnail?: string };
  link?: { url: string; openInNewTab: boolean };
  mobileMedia?: { type: "image" | "video"; url: string; alt: string };
  cards: CarouselSlideCard[];
  overlay?: {
    title?: string;
    subtitle?: string;
    description?: string;
    button?: {
      id: string;
      text: string;
      link: string;
      variant: "primary" | "secondary" | "outline";
      openInNewTab: boolean;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}
