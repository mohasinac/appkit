import type { IRepository, PagedResult } from "../../../contracts";
import type { UserProfile } from "../types";

export class AccountRepository {
  constructor(private readonly repo: IRepository<UserProfile>) {}

  async findById(id: string): Promise<UserProfile | null> {
    return this.repo.findById(id);
  }

  async update(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return this.repo.update(id, data);
  }

  async create(data: Omit<UserProfile, "id">): Promise<UserProfile> {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async findAll(
    query?: import("../../../contracts").SieveQuery,
  ): Promise<PagedResult<UserProfile>> {
    return this.repo.findAll(query ?? {});
  }
}
