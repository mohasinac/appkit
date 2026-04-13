import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { ProductItem } from "../types";

export class ProductsRepository {
  constructor(private readonly repo: IRepository<ProductItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<ProductItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findBySlug(slug: string): Promise<ProductItem | null> {
    const result = await this.repo.findAll({
      filters: `slug==${slug},status==published`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findBySeller(
    sellerId: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<ProductItem>> {
    return this.repo.findAll({
      filters: `sellerId==${sellerId},status==published`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findByCategory(
    categoryId: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<ProductItem>> {
    return this.repo.findAll({
      filters: `category==${categoryId},status==published`,
      sort: "-publishedAt",
      page,
      perPage,
    });
  }

  async findFeatured(limit = 8): Promise<ProductItem[]> {
    const result = await this.repo.findAll({
      filters: "status==published",
      sort: "-publishedAt",
      perPage: limit,
    });
    return result.data;
  }

  async findById(id: string): Promise<ProductItem | null> {
    return this.repo.findById(id);
  }

  /**
   * Find a product by its Firestore document ID or its URL slug.
   * Tries ID lookup first (O(1)); falls back to a Sieve slug query.
   */
  async findByIdOrSlug(idOrSlug: string): Promise<ProductItem | null> {
    const byId = await this.repo.findById(idOrSlug);
    if (byId) return byId;
    return this.findBySlug(idOrSlug);
  }

  async create(data: Omit<ProductItem, "id">): Promise<ProductItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<ProductItem>): Promise<ProductItem> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
