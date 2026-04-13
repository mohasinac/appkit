import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { SellerStore, PayoutRecord } from "../types";

export class SellerRepository {
  constructor(private readonly repo: IRepository<SellerStore>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<SellerStore>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<SellerStore | null> {
    return this.repo.findById(id);
  }

  async findByOwner(ownerId: string): Promise<SellerStore | null> {
    const result = await this.repo.findAll({
      filters: `ownerId==${ownerId}`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findBySlug(storeSlug: string): Promise<SellerStore | null> {
    const result = await this.repo.findAll({
      filters: `storeSlug==${storeSlug},status==active`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findActive(page = 1, perPage = 20): Promise<PagedResult<SellerStore>> {
    return this.repo.findAll({
      filters: "status==active,isPublic==true",
      sort: "-stats.totalProducts",
      page,
      perPage,
    });
  }

  async create(
    data: Omit<SellerStore, "id" | "createdAt" | "updatedAt">,
  ): Promise<SellerStore> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<SellerStore>): Promise<SellerStore> {
    return this.repo.update(id, data);
  }
}

export class PayoutsRepository {
  constructor(private readonly repo: IRepository<PayoutRecord>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<PayoutRecord>> {
    return this.repo.findAll(query ?? {});
  }

  async findBySeller(
    sellerId: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<PayoutRecord>> {
    return this.repo.findAll({
      filters: `sellerId==${sellerId}`,
      sort: "-requestedAt",
      page,
      perPage,
    });
  }

  async findPending(): Promise<PayoutRecord[]> {
    const result = await this.repo.findAll({
      filters: "status==pending",
      sort: "requestedAt",
    });
    return result.data;
  }

  async create(
    data: Omit<PayoutRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<PayoutRecord> {
    return this.repo.create(data);
  }

  async updateStatus(
    id: string,
    status: "processing" | "completed" | "failed",
    adminNote?: string,
  ): Promise<PayoutRecord> {
    return this.repo.update(id, {
      status,
      adminNote,
      processedAt: new Date().toISOString(),
    });
  }
}
