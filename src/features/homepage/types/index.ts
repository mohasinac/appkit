/*
 * 🛑 DELETED 2026-10-19 — a second, incompatible section vocabulary, attached
 * to LIVE, MOUNTED, publicly-reachable code.
 *
 * This file declared `HomepageSectionType` (9 values: `hero`,
 * `featured_categories`, `featured_products`, `banner`, `testimonials`,
 * `promotions`, `blog_posts`, `sellers`, `custom`), `HomepageSectionContent`,
 * `HomepageSection` and `HomepageData`, against the live `SectionType` in
 * `../schemas/firestore.ts`, which holds 25 values sharing exactly ONE
 * (`banner`) with this union. A second, independently-declared copy of the
 * same 9-value union lived in `seed/factories/homepage-section.factory.ts`
 * too — THREE incompatible section vocabularies in one codebase, none of them
 * the one the real renderer and repository use.
 *
 * This was not dead code sitting unused — `GET /api/homepage-sections` and
 * `GET/POST /api/homepage-sections/[id]` were REAL, MOUNTED routes (stubs
 * literally headed "feat-homepage — Pure stub", from a generic starter kit
 * never adapted to this project) reading/writing the SAME `homepageSections`
 * Firestore collection the real system owns, through a SECOND,
 * identically-named `HomepageSectionsRepository` class (a generic
 * `IRepository<HomepageSection>` wrapper in `repository/homepage.repository.ts`,
 * distinct from the real `BaseRepository`-backed one in
 * `homepage-sections.repository.ts`) — Root Cause #36's two-same-named-types
 * defect, on a REPOSITORY CLASS this time, with a live route behind it.
 *
 * Concretely, before this deletion: the stub's GET filtered on `isVisible==true`,
 * a field that does not exist on a real `HomepageSectionDocument` (the real
 * field is `enabled`), so unauthenticated requests always got `[]`; its POST
 * (admin-gated) would have written a document shaped `{ type: "hero", title,
 * content: {...} }` into the collection the real renderer reads, where
 * `SECTION_REGISTRY[section.type]` — see `../lib/section-renderer.tsx` — would
 * resolve to `undefined` and render nothing, with no error anywhere: a
 * corrupted, uneditable-through-the-real-admin-UI row, silently invisible.
 *
 * `useHomepage()` (the hook typed against `HomepageData`) fetched
 * `HOMEPAGE_ENDPOINTS.GET = "/api/homepage"`, which was never mounted at all.
 * `useHomepageSections()` called the stub above and had zero real callers —
 * only a comment in `AdminSectionsView.tsx` mentioning it existed.
 *
 * All of it is deleted: the two hooks, the stub API routes (`api/route.ts`,
 * `api/[id]/`, and a THIRD unused parallel stub at `api/sections/` for
 * `/api/homepage/sections`), the stub repository class, `HeroSection.tsx`
 * (zero real consumers), the seed factory, and the matching consumer-side
 * `src/app/api/homepage-sections/{route.ts,[id]/route.ts}`.
 *
 * The live contract is `SectionType` / `SectionConfig` / `HomepageSectionDocument`
 * in `../schemas/firestore.ts`, served by `GET /api/admin/sections` and read
 * directly by `MarketplaceHomepageView` via `homepageSectionsRepository`.
 */

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
