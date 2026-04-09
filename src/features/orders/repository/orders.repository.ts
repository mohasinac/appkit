import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "@mohasinac/contracts";
import type { Order, OrderStatus } from "../types";

export class OrdersRepository {
  constructor(private readonly repo: IRepository<Order>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<Order>> {
    return this.repo.findAll(query ?? {});
  }

  async findByUser(
    userId: string,
    page = 1,
    perPage = 10,
  ): Promise<PagedResult<Order>> {
    return this.repo.findAll({
      filters: `userId==${userId}`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<Order, "id">): Promise<Order> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    return this.repo.update(id, data);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.repo.update(id, { orderStatus: status });
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
