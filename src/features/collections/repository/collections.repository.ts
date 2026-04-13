import type { IRepository } from "../../../contracts";
import type { CollectionItem } from "../types";

export class CollectionsRepository {
  constructor(private readonly repo: IRepository<CollectionItem>) {}

  async findBySlug(slug: string): Promise<CollectionItem | null> {
    return this.repo.findById(slug);
  }

  async findActive(): Promise<CollectionItem[]> {
    const result = await this.repo.findAll({
      filters: "active==true",
      sort: "sortOrder",
      order: "asc",
    });
    return result.data;
  }
}
