/**
 * @mohasinac/appkit/features/wishlist/server
 *
 * Server-only entry point for wishlist repositories.
 */
export * from "./actions";

export {
  UserWishlistRepository,
  wishlistRepository,
  WishlistFullError,
  type UserWishlistItem,
  type WishlistDocument,
  type WishlistItemSnapshot,
} from "./repository/user-wishlist.repository";
