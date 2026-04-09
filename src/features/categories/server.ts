/**
 * @mohasinac/appkit/features/categories/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export { GET as categoriesGET, GET, POST } from "./api/route";
export {
  categoryItemGET,
  categoryItemPATCH,
  categoryItemDELETE,
} from "./api/[id]/route";
