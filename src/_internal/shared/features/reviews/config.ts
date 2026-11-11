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
/**
 * How many photos one review may carry.
 *
 * ────────────────────────────────────────────────────────────────────────
 * 🛑 RE-EXPORTED, NOT RE-DECLARED — because the two disagreed, and the
 * disagreement was user-visible.
 * ────────────────────────────────────────────────────────────────────────
 *
 * This said `5` while `_internal/shared/media/limits.ts` said `6`, and a
 * third literal `.max(6)` sat in the host's order-completion route. The `6`
 * is the one exported through `client.ts` / `index.ts` / `server.ts`, i.e.
 * the number a UI reads to decide how many slots to render.
 *
 * So a buyer was shown six slots, filled six, and `reviewSchema` rejected the
 * submission at five — a validation error from a limit they were never told
 * about. Nothing logged it, because nothing was wrong from either file's own
 * point of view.
 *
 * ⚠ Unified UPWARD on purpose. Loosening the stricter path cannot reject a
 * submission that used to succeed; tightening to `5` would start refusing
 * the sixth photo the UI is still inviting. The safe direction when two
 * limits disagree is the one already advertised.
 *
 * 🛑 One declaration now. `media/limits` owns it, because that is where every
 * other media cap lives and where the published barrels already point.
 */
export { REVIEW_MAX_IMAGES as REVIEW_IMAGES_MAX } from "../../media/limits";
export const REVIEW_REPLY_MAX_LENGTH = 1000;
export const REVIEW_BODY_MIN_LENGTH = 10;
