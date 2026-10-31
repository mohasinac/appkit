/**
 * `HeroCarousel` renders the first `MAX_ACTIVE_SLIDES` slides it is given and
 * silently ignores the rest. Every producer of the hero slide list — the live
 * events→slides computation (`getHeroCarouselSlides`), the public
 * `GET /api/carousel` handler — must cap against this same constant so a
 * truncation decision is made once, not re-guessed per call site.
 */
export const MAX_ACTIVE_SLIDES = 5 as const;
