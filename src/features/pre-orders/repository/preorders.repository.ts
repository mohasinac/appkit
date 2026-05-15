import type { IRepository } from "../../../contracts";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import type { PreorderItem } from "../types";

const { LISTING_TYPE, STATUS, FEATURED, CREATED_AT } = PRODUCT_FIELDS;
const { PRE_ORDER } = PRODUCT_FIELDS.LISTING_TYPE_VALUES;
const { PUBLISHED } = PRODUCT_FIELDS.STATUS_VALUES;

export class PreordersRepository {
  constructor(private readonly repo: IRepository<PreorderItem>) {}

  async findPreorders(): Promise<PreorderItem[]> {
    const result = await this.repo.findAll({
      filters: `${LISTING_TYPE}==${PRE_ORDER},${STATUS}==${PUBLISHED}`,
      sort: CREATED_AT,
      order: "desc",
    });
    return result.data;
  }

  async findFeaturedPreorders(): Promise<PreorderItem[]> {
    const result = await this.repo.findAll({
      filters: `${LISTING_TYPE}==${PRE_ORDER},${STATUS}==${PUBLISHED},${FEATURED}==true`,
      sort: CREATED_AT,
      order: "desc",
    });
    return result.data;
  }
}
