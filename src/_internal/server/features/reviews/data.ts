import { cache } from "react";
import { reviewRepository, orderRepository } from "../../../../repositories";

export const getReviewsForProduct = cache(
  async (productId: string) => {
    return reviewRepository.findApprovedByProduct(productId).catch(() => []);
  },
);

export const getReviewsForStore = cache(
  async (storeId: string, page = 1, pageSize = 20) => {
    return reviewRepository.listForStore(storeId, { page, pageSize }).catch(() => ({
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasMore: false,
    }));
  },
);

export const hasUserPurchasedProduct = cache(
  async (userId: string, productId: string): Promise<boolean> => {
    return orderRepository.hasUserPurchased(userId, productId).catch(() => false);
  },
);
