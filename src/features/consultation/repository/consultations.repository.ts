import type { IRepository, PagedResult, SieveQuery } from "@mohasinac/contracts";
import type { ConsultationBooking, ConsultationStatus } from "../types";

export class ConsultationsRepository {
  constructor(private readonly repo: IRepository<ConsultationBooking>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<ConsultationBooking>> {
    return this.repo.findAll(query);
  }

  async findByStatus(status: ConsultationStatus): Promise<ConsultationBooking[]> {
    const result = await this.repo.findAll({
      filters: `status==${status}`,
      sort: "-createdAt",
      perPage: 100,
    });
    return result.data;
  }

  async findById(id: string): Promise<ConsultationBooking | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<ConsultationBooking, "id">): Promise<ConsultationBooking> {
    return this.repo.create(data);
  }

  async updateStatus(id: string, status: ConsultationStatus, adminNote?: string): Promise<ConsultationBooking> {
    return this.repo.update(id, { status, ...(adminNote !== undefined ? { adminNote } : {}) });
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
