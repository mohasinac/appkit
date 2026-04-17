/**
 * @mohasinac/appkit/features/reviews/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
import "server-only";

export * from "./actions";

export {
  ReviewRepository,
  ReviewsRepository,
  reviewRepository,
} from "./repository/reviews.repository";

export { GET as reviewsGET, GET, POST } from "./api/route";
export {
  reviewItemGET,
  reviewItemPATCH,
  reviewItemDELETE,
} from "./api/[id]/route";
