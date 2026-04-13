import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { BlogPost, BlogPostCategory } from "../types";

export class BlogRepository {
  constructor(private readonly repo: IRepository<BlogPost>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<BlogPost>> {
    const base: SieveQuery = { filters: "status==published", ...query };
    if (query?.filters) {
      base.filters = `status==published,${query.filters}`;
    }
    return this.repo.findAll(base);
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const result = await this.repo.findAll({
      filters: `slug==${slug},status==published`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findLatest(n = 5): Promise<BlogPost[]> {
    const result = await this.repo.findAll({
      filters: "status==published",
      sort: "-publishedAt",
      perPage: n,
    });
    return result.data;
  }

  async findFeatured(n = 3): Promise<BlogPost[]> {
    const result = await this.repo.findAll({
      filters: "status==published,isFeatured==true",
      sort: "-publishedAt",
      perPage: n,
    });
    return result.data;
  }

  async findByCategory(
    category: BlogPostCategory,
    page = 1,
    perPage = 10,
  ): Promise<PagedResult<BlogPost>> {
    return this.repo.findAll({
      filters: `status==published,category==${category}`,
      sort: "-publishedAt",
      page,
      perPage,
    });
  }

  async findById(id: string): Promise<BlogPost | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<BlogPost, "id">): Promise<BlogPost> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<BlogPost>): Promise<BlogPost> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
