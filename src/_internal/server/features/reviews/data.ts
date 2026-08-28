import { cache } from "react";
import { reviewRepository, orderRepository } from "../../../../repositories";
import { safeRead } from "../../../../errors/safe-read";
import { REVIEWS_DETAIL_PAGE_SIZE } from "../../../shared/features/reviews/config";

export const getReviewsForProduct = cache(
  async (productId: string, limit = REVIEWS_DETAIL_PAGE_SIZE) => {
    return safeRead(() => reviewRepository.findApprovedByProduct(productId, limit), {
      route: "/products",
      key: "reviews.getReviewsForProduct",
      fallback: [],
    });
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
