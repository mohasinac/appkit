/**
 * @mohasinac/appkit/features/categories/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
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

/*
 * The seller form's template read. A separate route rather than a field on
 * `categoryItemGET` because that one returns the whole document and is not
 * edge-cached — this is a narrow, hour-cacheable answer to one question, hit
 * on every category change in the form.
 */
export { GET as categoryDescriptionTemplateGET } from "./api/[id]/description-template/route";
