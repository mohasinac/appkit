import type { IRepository } from "@mohasinac/contracts";
import type { PreorderItem } from "../types";

export class PreordersRepository {
  constructor(private readonly repo: IRepository<PreorderItem>) {}

  async findPreorders(): Promise<PreorderItem[]> {
    const result = await this.repo.findAll({
      filters: "isPreorder==true,active==true",
      sort: "createdAt",
      order: "desc",
    });
    return result.data;
  }

  async findFeaturedPreorders(): Promise<PreorderItem[]> {
    const result = await this.repo.findAll({
      filters: "isPreorder==true,active==true,isFeatured==true",
      sort: "createdAt",
      order: "desc",
    });
    return result.data;
  }
}
