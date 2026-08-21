/** Page size for the dedicated review listing surfaces (`/reviews`, `/stores/[slug]/reviews`). */
export const REVIEWS_PAGE_SIZE = 12;
/**
 * Page size for the reviews section embedded in a listing detail page. Smaller than
 * REVIEWS_PAGE_SIZE on purpose — the tab sits inside a page that already has a lot of
 * content, and an unpaginated list was what made those pages endlessly long.
 */
export const REVIEWS_DETAIL_PAGE_SIZE = 10;
export const REVIEW_BODY_MAX_LENGTH = 2000;
export const REVIEW_TITLE_MAX_LENGTH = 100;
export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_IMAGES_MAX = 5;
export const REVIEW_REPLY_MAX_LENGTH = 1000;
export const REVIEW_BODY_MIN_LENGTH = 10;
