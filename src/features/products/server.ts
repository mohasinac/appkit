/**
 * @mohasinac/appkit/features/products/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
export * from "./actions";

export {
  ProductRepository,
  ProductsRepository,
  productRepository,
} from "./repository/products.repository";

export { GET, POST } from "./api/route";
export {
  GET as productItemGET,
  PATCH as productItemPATCH,
  DELETE as productItemDELETE,
} from "./api/[id]/route";
