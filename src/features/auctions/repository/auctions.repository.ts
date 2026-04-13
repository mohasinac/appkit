import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import type { AuctionItem } from "../types";

export class AuctionsRepository {
  constructor(private readonly repo: IRepository<AuctionItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<AuctionItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<AuctionItem | null> {
    return this.repo.findById(id);
  }

  async findBySlug(slug: string): Promise<AuctionItem | null> {
    const result = await this.repo.findAll({
      filters: `slug==${slug},status==published,isAuction==true`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findActive(page = 1, perPage = 20): Promise<PagedResult<AuctionItem>> {
    return this.repo.findAll({
      filters: "status==published,isAuction==true",
      sort: "auctionEndDate",
      page,
      perPage,
    });
  }

  async findByStore(
    storeSlug: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<AuctionItem>> {
    return this.repo.findAll({
      filters: `storeSlug==${storeSlug},status==published,isAuction==true`,
      sort: "auctionEndDate",
      page,
      perPage,
    });
  }

  async findFeatured(limit = 6): Promise<AuctionItem[]> {
    const result = await this.repo.findAll({
      filters: "status==published,isAuction==true,featured==true",
      sort: "auctionEndDate",
      perPage: limit,
    });
    return result.data;
  }
}
