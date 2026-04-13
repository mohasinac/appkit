import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { HomepageSection } from "../types";

export class HomepageSectionsRepository {
  constructor(private readonly repo: IRepository<HomepageSection>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<HomepageSection>> {
    return this.repo.findAll({
      filters: "isVisible==true",
      sort: "order",
      perPage: 50,
      ...query,
    });
  }

  async findById(id: string): Promise<HomepageSection | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<HomepageSection, "id">): Promise<HomepageSection> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: Partial<HomepageSection>,
  ): Promise<HomepageSection> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
