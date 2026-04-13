import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { CartItem } from "../types";

export class CartRepository {
  constructor(private readonly repo: IRepository<CartItem>) {}

  async findByUser(userId: string): Promise<CartItem[]> {
    const result = await this.repo.findAll({
      filters: `userId==${userId}`,
      perPage: 100,
    });
    return result.data;
  }

  async findBySession(sessionId: string): Promise<CartItem[]> {
    const result = await this.repo.findAll({
      filters: `sessionId==${sessionId}`,
      perPage: 100,
    });
    return result.data;
  }

  async findAll(query?: SieveQuery): Promise<PagedResult<CartItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<CartItem | null> {
    return this.repo.findById(id);
  }

  async add(data: Omit<CartItem, "id">): Promise<CartItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<CartItem>): Promise<CartItem> {
    return this.repo.update(id, data);
  }

  async remove(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
