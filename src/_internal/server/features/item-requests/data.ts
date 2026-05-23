/**
 * Item Request data layer — OG-coverage-followup 2026-05-23.
 *
 * Item requests are buyer-posted "want to buy" threads sellers reply to.
 * This file wraps the repo call in `React.cache` so the OG renderer (and
 * any future page/generateMetadata pair) share one Firestore read per
 * request.
 */

import { cache } from "react";
import { itemRequestsRepository } from "../../../../repositories";
import type { ItemRequestDocument } from "../../../../features/store-extensions/schemas/firestore";

export interface ItemRequestDataOptions {
  _reserved?: never;
}

/**
 * Fetch a single item-request by id. Returns null when the id is empty
 * or no matching document exists.
 */
export const getItemRequestForDetail = cache(
  async (
    id: string,
    _opts?: ItemRequestDataOptions,
  ): Promise<ItemRequestDocument | null> => {
    void _opts;
    if (!id) return null;
    return (await itemRequestsRepository.findById(id).catch(() => null)) ?? null;
  },
);
