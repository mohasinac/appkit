import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "@mohasinac/contracts";
import type { PreOrderItem, PreOrderStatus } from "../types";

export class PreOrdersRepository {
  constructor(private readonly repo: IRepository<PreOrderItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<PreOrderItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<PreOrderItem | null> {
    return this.repo.findById(id);
  }

  async findByCustomer(
    customerId: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<PreOrderItem>> {
    return this.repo.findAll({
      filters: `customerId==${customerId}`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findBySeller(
    sellerId: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<PreOrderItem>> {
    return this.repo.findAll({
      filters: `sellerId==${sellerId}`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findByStatus(
    status: PreOrderStatus,
    page = 1,
    perPage = 50,
  ): Promise<PagedResult<PreOrderItem>> {
    return this.repo.findAll({
      filters: `status==${status}`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async create(
    data: Omit<PreOrderItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<PreOrderItem> {
    return this.repo.create(data);
  }

  async updateStatus(
    id: string,
    status: PreOrderStatus,
    adminNote?: string,
  ): Promise<PreOrderItem> {
    return this.repo.update(id, { status, adminNote });
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
