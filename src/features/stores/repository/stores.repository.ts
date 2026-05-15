import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "../../../contracts";
import { STORE_FIELDS } from "../../../constants/field-names";
import type { StoreListItem } from "../types";

const { STATUS, IS_PUBLIC, STORE_SLUG, STORE_CATEGORY, STATS_FIELDS } = STORE_FIELDS;
const { ACTIVE } = STORE_FIELDS.STATUS_VALUES;

export class StoresRepository {
  constructor(private readonly repo: IRepository<StoreListItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<StoreListItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<StoreListItem | null> {
    return this.repo.findById(id);
  }

  async findBySlug(storeSlug: string): Promise<StoreListItem | null> {
    const result = await this.repo.findAll({
      filters: `${STORE_SLUG}==${storeSlug},${STATUS}==${ACTIVE}`,
      perPage: 1,
    });
    return result.data[0] ?? null;
  }

  async findActive(
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<StoreListItem>> {
    return this.repo.findAll({
      filters: `${STATUS}==${ACTIVE},${IS_PUBLIC}==true`,
      sort: `-${STATS_FIELDS.ITEMS_SOLD}`,
      page,
      perPage,
    });
  }

  async findByCategory(
    category: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<StoreListItem>> {
    return this.repo.findAll({
      filters: `${STORE_CATEGORY}==${category},${STATUS}==${ACTIVE}`,
      sort: `-${STATS_FIELDS.AVERAGE_RATING}`,
      page,
      perPage,
    });
  }
}
