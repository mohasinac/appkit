import { cache } from "react";
import { historyRepository } from "../../../../features/history/repository/user-history.repository";
import type { UserHistoryItem } from "../../../../features/history/repository/user-history.repository";

export const getHistoryForUser = cache(
  async (userId: string): Promise<{ items: UserHistoryItem[]; meta: { total: number } }> => {
    const items = await historyRepository.getHistory(userId).catch(() => [] as UserHistoryItem[]);
    return { items, meta: { total: items.length } };
  },
);
