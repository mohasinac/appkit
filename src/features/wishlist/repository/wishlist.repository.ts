import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { WishlistItem } from "../types";

export class WishlistRepository {
  constructor(private readonly repo: IRepository<WishlistItem>) {}

  async findByUser(userId: string): Promise<WishlistItem[]> {
    const result = await this.repo.findAll({
      filters: `userId==${userId}`,
      sort: "-addedAt",
      perPage: 200,
    });
    return result.data;
  }

  async findAll(query?: SieveQuery): Promise<PagedResult<WishlistItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<WishlistItem | null> {
    return this.repo.findById(id);
  }

  async add(data: Omit<WishlistItem, "id">): Promise<WishlistItem> {
    return this.repo.create(data);
  }

  async remove(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async update(id: string, data: Partial<WishlistItem>): Promise<WishlistItem> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
