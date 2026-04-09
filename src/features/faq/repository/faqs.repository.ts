import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "@mohasinac/contracts";
import type { FAQ, FAQCategory } from "../types";

export class FAQsRepository {
  constructor(private readonly repo: IRepository<FAQ>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<FAQ>> {
    const base: SieveQuery = { filters: "isActive==true", ...query };
    if (query?.filters) {
      base.filters = `isActive==true,${query.filters}`;
    }
    return this.repo.findAll(base);
  }

  async findByCategory(category: FAQCategory): Promise<FAQ[]> {
    const result = await this.repo.findAll({
      filters: `isActive==true,category==${category}`,
      sort: "order",
      perPage: 100,
    });
    return result.data;
  }

  async findForHomepage(): Promise<FAQ[]> {
    const result = await this.repo.findAll({
      filters: "isActive==true,showOnHomepage==true",
      sort: "priority",
      perPage: 10,
    });
    return result.data;
  }

  async findForFooter(): Promise<FAQ[]> {
    const result = await this.repo.findAll({
      filters: "isActive==true,showInFooter==true",
      sort: "order",
      perPage: 20,
    });
    return result.data;
  }

  async findById(id: string): Promise<FAQ | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<FAQ, "id">): Promise<FAQ> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<FAQ>): Promise<FAQ> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
