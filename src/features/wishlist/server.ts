/**
 * @mohasinac/appkit/features/wishlist/server
 *
 * Server-only entry point for wishlist repositories.
 */
export * from "./actions";

export { WishlistRepository } from "./repository/wishlist.repository";
export {
  UserWishlistRepository,
  wishlistRepository,
} from "./repository/user-wishlist.repository";
