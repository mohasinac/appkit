/**
 * Carousel per-view presets used by the homepage section carousels.
 *
 * Extracted from `THEME_CONSTANTS.carousel.perView` so the consumer sweep
 * can drop the THEME_CONSTANTS dependency.
 */
export const CAROUSEL_PER_VIEW = {
  /** Default: 1 on mobile, 2 on sm, 3 on md+ */
  default: { base: 1, sm: 2, md: 3 } as const,
  /** Standard: 1 on mobile, 3 on md, 4 on lg+ — the canonical homepage carousel preset */
  standard: { base: 1, md: 3, lg: 4 } as const,
  /** Cards: 1 on mobile, 2 on sm, 3 on md, 4 on lg+ */
  cards: { base: 1, sm: 2, md: 3, lg: 4 } as const,
  /** Compact cards: 1 on mobile, 2 on sm, 4 on md, 5 on xl+ */
  compact: { base: 1, sm: 2, md: 4, xl: 5 } as const,
  /** Reviews: 1 on mobile, 2 on sm, 3 on md/lg, 4 on 2xl+ */
  reviews: { base: 1, sm: 2, md: 3, lg: 3, "2xl": 4 } as const,
  /** Events: 1 on mobile, 2 on sm, 3 on md, 4 on lg+ */
  events: { base: 1, sm: 2, md: 3, lg: 4 } as const,
  /** Featured cards: 1 on mobile, 2 on sm, 3 on lg+ */
  featuredCards: { base: 1, sm: 2, lg: 3 } as const,
} as const;

export type CarouselPerViewPreset = keyof typeof CAROUSEL_PER_VIEW;
