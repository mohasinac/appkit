/**
 * @mohasinac/appkit/features/products/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export { GET, POST } from "./api/route";
export {
  GET as productItemGET,
  PATCH as productItemPATCH,
  DELETE as productItemDELETE,
} from "./api/[id]/route";
