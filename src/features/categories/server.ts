/**
 * @mohasinac/appkit/features/categories/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
import "server-only";

export * from "./actions";

export {
  CategoriesRepository,
  categoriesRepository,
} from "./repository/categories.repository";

export { GET as categoriesGET, GET, POST } from "./api/route";
export {
  categoryItemGET,
  categoryItemPATCH,
  categoryItemDELETE,
} from "./api/[id]/route";
