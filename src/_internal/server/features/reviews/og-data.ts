import { cache } from "react";
import { reviewRepository } from "../../../../repositories";

export const getReviewById = cache(async (id: string) => {
  if (!id) return null;
  return reviewRepository.findById(id).catch(() => null);
});
