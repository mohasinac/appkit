import type { IRepository, PagedResult, SieveQuery } from "@mohasinac/contracts";
import type { BeforeAfterItem } from "../types";

export class BeforeAfterRepository {
  constructor(private readonly repo: IRepository<BeforeAfterItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<BeforeAfterItem>> {
    return this.repo.findAll(query);
  }

  async findActive(): Promise<BeforeAfterItem[]> {
    const result = await this.repo.findAll({
      filters: "isActive==true",
      sort: "sortOrder",
      perPage: 50,
    });
    return result.data;
  }

  async findByConcern(concern: string): Promise<BeforeAfterItem[]> {
    const result = await this.repo.findAll({
      filters: `isActive==true,concern==${concern}`,
      sort: "sortOrder",
      perPage: 50,
    });
    return result.data;
  }

  async findById(id: string): Promise<BeforeAfterItem | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<BeforeAfterItem, "id">): Promise<BeforeAfterItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<Omit<BeforeAfterItem, "id">>): Promise<BeforeAfterItem> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
