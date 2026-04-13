import type { IRepository, PagedResult, SieveQuery } from "../../../contracts";
import type { CorporateInquiry, CorporateInquiryStatus } from "../types";

export class CorporateRepository {
  constructor(private readonly repo: IRepository<CorporateInquiry>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<CorporateInquiry>> {
    return this.repo.findAll(query);
  }

  async findByStatus(status: CorporateInquiryStatus): Promise<CorporateInquiry[]> {
    const result = await this.repo.findAll({
      filters: `status==${status}`,
      sort: "-createdAt",
      perPage: 100,
    });
    return result.data;
  }

  async findById(id: string): Promise<CorporateInquiry | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<CorporateInquiry, "id">): Promise<CorporateInquiry> {
    return this.repo.create(data);
  }

  async updateStatus(
    id: string,
    status: CorporateInquiryStatus,
    adminNote?: string,
  ): Promise<CorporateInquiry> {
    return this.repo.update(id, { status, ...(adminNote !== undefined ? { adminNote } : {}) });
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
