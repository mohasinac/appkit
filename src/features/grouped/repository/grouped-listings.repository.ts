import { BaseRepository } from "../../../providers/db-firebase";
import {
  GROUPED_LISTINGS_COLLECTION,
  type GroupedListingDocument,
} from "../schemas/firestore";

export class GroupedListingsRepository extends BaseRepository<GroupedListingDocument> {
  constructor() {
    super(GROUPED_LISTINGS_COLLECTION);
  }

  async listByStore(storeId: string): Promise<{ items: GroupedListingDocument[] }> {
    const items = await this.findBy("storeId", storeId);
    return { items };
  }
}

export const groupedListingsRepository = new GroupedListingsRepository();
