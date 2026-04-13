import type {
  IReadRepository,
  SieveQuery,
  PagedResult,
} from "../../../contracts";
import type { SearchProductItem, SearchQuery, SearchResponse } from "../types";

/**
 * SearchRepository
 *
 * Wraps IReadRepository<SearchProductItem> to provide domain-specific
 * search query building. Injected at the application layer — this class
 * has zero knowledge of Firestore, Prisma, or any concrete DB.
 */
export class SearchRepository {
  constructor(private readonly repo: IReadRepository<SearchProductItem>) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const filterParts: string[] = [];

    if (query.q) filterParts.push(`title_=${query.q}`);
    if (query.category) filterParts.push(`category==${query.category}`);
    if (query.subcategory)
      filterParts.push(`subcategory==${query.subcategory}`);
    if (query.minPrice !== undefined)
      filterParts.push(`price>=${String(query.minPrice)}`);
    if (query.maxPrice !== undefined)
      filterParts.push(`price<=${String(query.maxPrice)}`);
    if (query.condition) filterParts.push(`condition==${query.condition}`);
    if (query.isAuction === true) filterParts.push("isAuction==true");
    if (query.isAuction === false) filterParts.push("isAuction==false");
    if (query.isPreOrder === true) filterParts.push("isPreOrder==true");
    if (query.inStock === true) filterParts.push("availableQuantity>0");
    if (query.minRating !== undefined)
      filterParts.push(`averageRating>=${String(query.minRating)}`);

    filterParts.push("status==published");

    const sieveQuery: SieveQuery = {
      filters: filterParts.join(","),
      sort: query.sort
        ? query.sort.startsWith("-")
          ? query.sort.slice(1)
          : query.sort
        : "createdAt",
      order: query.sort?.startsWith("-") ? "desc" : "asc",
      page: query.page ?? 1,
      perPage: query.pageSize ?? 24,
    };

    const result: PagedResult<SearchProductItem> =
      await this.repo.findAll(sieveQuery);

    return {
      items: result.data,
      q: query.q ?? "",
      total: result.total,
      page: result.page,
      pageSize: result.perPage,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    };
  }
}
