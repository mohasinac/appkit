import { cache } from "react";
import { historyRepository, type UserHistoryItem } from "../../../../repositories";

export const getHistoryForUser = cache(
  async (userId: string): Promise<{ items: UserHistoryItem[]; meta: { total: number } }> => {
    const items = await historyRepository.getHistory(userId).catch(() => [] as UserHistoryItem[]);
    return { items, meta: { total: items.length } };
  },
);
