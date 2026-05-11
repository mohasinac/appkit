import { cache } from "react";
import { orderRepository } from "../../../../repositories";

export const getOrderForDetail = cache(
  async (orderId: string) => {
    return (await orderRepository.findById(orderId).catch(() => undefined)) ?? null;
  },
);

export const getOrdersForBuyer = cache(
  async (userId: string, page = 1, pageSize = 20) => {
    return orderRepository.listForUser(userId, { page, pageSize }).catch(() => ({
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasMore: false,
    }));
  },
);

export const getRecentOrdersForBuyer = cache(
  async (userId: string) => {
    return orderRepository.findRecentByUser(userId).catch(() => []);
  },
);
