/**
 * Messages data layer — server-only fetchers with React.cache dedup.
 * RTDB ping channel is preserved (the actions module owns that side effect).
 */

import { cache } from "react";
import {
  listConversationsForBuyer as _listConversationsForBuyer,
  listConversationsForStore as _listConversationsForStore,
  getConversation as _getConversation,
} from "../../../../features/messages/actions/messages-actions";

export interface MessagesDataOptions {
  _reserved?: never;
}

export const listConversationsForBuyer = cache(
  async (buyerId: string, _opts?: MessagesDataOptions) => {
    void _opts;
    if (!buyerId) return [];
    return _listConversationsForBuyer(buyerId);
  },
);

export const listConversationsForStore = cache(
  async (storeId: string, _opts?: MessagesDataOptions) => {
    void _opts;
    if (!storeId) return [];
    return _listConversationsForStore(storeId);
  },
);

export const getConversation = cache(
  async (convId: string, _opts?: MessagesDataOptions) => {
    void _opts;
    if (!convId) return null;
    return _getConversation(convId);
  },
);
