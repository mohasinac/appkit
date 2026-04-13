import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { CouponItem } from "../types";

export class PromotionsRepository {
  constructor(private readonly repo: IRepository<CouponItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<CouponItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<CouponItem | null> {
    return this.repo.findById(id);
  }

  async findByCode(code: string): Promise<CouponItem | null> {
    const result = await this.repo.findAll({
      filters: `code==${code.toUpperCase()},isActive==true`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findActive(page = 1, perPage = 20): Promise<PagedResult<CouponItem>> {
    return this.repo.findAll({
      filters: "isActive==true,isPublic==true",
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findBySeller(
    sellerId: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<CouponItem>> {
    return this.repo.findAll({
      filters: `sellerId==${sellerId}`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async create(
    data: Omit<CouponItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<CouponItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<CouponItem>): Promise<CouponItem> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
