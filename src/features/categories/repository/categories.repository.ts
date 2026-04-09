import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "@mohasinac/contracts";
import type { CategoryItem, CategoryType } from "../types";

export class CategoriesRepository {
  constructor(private readonly repo: IRepository<CategoryItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<CategoryItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findByType(type: CategoryType, perPage = 100): Promise<CategoryItem[]> {
    const result = await this.repo.findAll({
      filters: `type==${type}`,
      perPage,
    });
    return result.data;
  }

  async findConcerns(perPage = 100): Promise<CategoryItem[]> {
    return this.findByType("concern", perPage);
  }

  async findBySlug(slug: string): Promise<CategoryItem | null> {
    const result = await this.repo.findAll({
      filters: `slug==${slug}`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findChildren(parentId: string): Promise<CategoryItem[]> {
    const result = await this.repo.findAll({
      filters: `parentIds@=${parentId}`,
      perPage: 100,
    });
    return result.data;
  }

  async findFeatured(limit = 12): Promise<CategoryItem[]> {
    const result = await this.repo.findAll({
      filters: "isFeatured==true",
      sort: "featuredPriority",
      perPage: limit,
    });
    return result.data;
  }

  async findRoots(): Promise<CategoryItem[]> {
    const result = await this.repo.findAll({
      filters: "tier==1",
      sort: "order",
      perPage: 100,
    });
    return result.data;
  }

  async findById(id: string): Promise<CategoryItem | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<CategoryItem, "id">): Promise<CategoryItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<CategoryItem>): Promise<CategoryItem> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
