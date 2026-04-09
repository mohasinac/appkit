import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "@mohasinac/contracts";
import type { StoreListItem } from "../types";

export class StoresRepository {
  constructor(private readonly repo: IRepository<StoreListItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<StoreListItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<StoreListItem | null> {
    return this.repo.findById(id);
  }

  async findBySlug(storeSlug: string): Promise<StoreListItem | null> {
    const result = await this.repo.findAll({
      filters: `storeSlug==${storeSlug},status==active`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findActive(
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<StoreListItem>> {
    return this.repo.findAll({
      filters: "status==active,isPublic==true",
      sort: "-itemsSold",
      page,
      perPage,
    });
  }

  async findByCategory(
    category: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<StoreListItem>> {
    return this.repo.findAll({
      filters: `storeCategory==${category},status==active`,
      sort: "-averageRating",
      page,
      perPage,
    });
  }
}
