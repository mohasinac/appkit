import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { Review, ReviewStatus } from "../types";

export class ReviewsRepository {
  constructor(private readonly repo: IRepository<Review>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<Review>> {
    return this.repo.findAll(query ?? {});
  }

  async findByProduct(
    productId: string,
    page = 1,
    perPage = 10,
  ): Promise<PagedResult<Review>> {
    return this.repo.findAll({
      filters: `productId==${productId},status==approved`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findByUser(
    userId: string,
    page = 1,
    perPage = 10,
  ): Promise<PagedResult<Review>> {
    return this.repo.findAll({
      filters: `userId==${userId}`,
      sort: "-createdAt",
      page,
      perPage,
    });
  }

  async findPending(page = 1, perPage = 20): Promise<PagedResult<Review>> {
    return this.repo.findAll({
      filters: "status==pending",
      sort: "createdAt",
      page,
      perPage,
    });
  }

  async findById(id: string): Promise<Review | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<Review, "id">): Promise<Review> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<Review>): Promise<Review> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async updateStatus(id: string, status: ReviewStatus): Promise<Review> {
    return this.repo.update(id, { status });
  }
}
