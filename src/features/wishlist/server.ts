/**
 * @mohasinac/appkit/features/wishlist/server
 *
 * Server-only entry point for wishlist repositories.
 */
import "server-only";

export * from "./actions";

export { WishlistRepository } from "./repository/wishlist.repository";
export {
  UserWishlistRepository,
  wishlistRepository,
} from "./repository/user-wishlist.repository";
