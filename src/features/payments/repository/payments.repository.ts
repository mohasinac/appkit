import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { PaymentRecord, PaymentSettings } from "../types";

export class PaymentsRepository {
  constructor(
    private readonly paymentsRepo: IRepository<PaymentRecord>,
    private readonly settingsRepo: IRepository<PaymentSettings>,
  ) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<PaymentRecord>> {
    return this.paymentsRepo.findAll(query ?? {});
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    return this.paymentsRepo.findById(id);
  }

  async findByOrder(orderId: string): Promise<PaymentRecord[]> {
    const result = await this.paymentsRepo.findAll({
      filters: `orderId==${orderId}`,
      sort: "-createdAt",
      perPage: 20,
    });
    return result.data;
  }

  async create(data: Omit<PaymentRecord, "id">): Promise<PaymentRecord> {
    return this.paymentsRepo.create(data);
  }

  async update(
    id: string,
    data: Partial<PaymentRecord>,
  ): Promise<PaymentRecord> {
    return this.paymentsRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.paymentsRepo.delete(id);
  }

  async getSettings(): Promise<PaymentSettings | null> {
    const result = await this.settingsRepo.findAll({ perPage: 1 });
    return result.data[0] ?? null;
  }

  async updateSettings(
    id: string,
    data: Partial<PaymentSettings>,
  ): Promise<PaymentSettings> {
    return this.settingsRepo.update(id, data);
  }
}
