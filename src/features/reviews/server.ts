/**
 * @mohasinac/appkit/features/reviews/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export { GET as reviewsGET, GET, POST } from "./api/route";
export {
  reviewItemGET,
  reviewItemPATCH,
  reviewItemDELETE,
} from "./api/[id]/route";
