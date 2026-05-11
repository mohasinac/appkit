/**
 * @mohasinac/appkit/constants/limits
 *
 * User-facing hard caps for wishlist, history, and cart.
 * - WISHLIST_MAX:  hard cap, block + warn (intentional saves; FIFO would discard user intent).
 * - HISTORY_MAX:   soft cap, silent FIFO evict (auto-tracking, not user intent).
 * - CART_MAX_ITEMS: hard cap on distinct items, block + warn. Per-item qty is unrestricted.
 */
export const WISHLIST_MAX = 20;
export const HISTORY_MAX = 50;
export const CART_MAX_ITEMS = 50;

export const WISHLIST_DOC_ID = (userSlug: string) => `wishlist-${userSlug}`;
export const HISTORY_DOC_ID = (userSlug: string) => `history-${userSlug}`;

export const WISHLIST_COLLECTION = "wishlists";
export const HISTORY_COLLECTION = "history";
