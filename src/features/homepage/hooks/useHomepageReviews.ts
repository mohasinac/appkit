import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { Review } from "../../reviews";
import { REVIEW_ENDPOINTS } from "../../../constants/api-endpoints";

export interface UseHomepageReviewsOptions {
  endpoint?: string;
  initialData?: Review[];
  staleTime?: number;
}

export function useHomepageReviews(options?: UseHomepageReviewsOptions) {
  return useQuery<Review[]>({
    queryKey: [
      "reviews",
      "latest",
      options?.endpoint ?? REVIEW_ENDPOINTS.FEATURED,
    ],
    queryFn: () =>
      apiClient.get<Review[]>(
        options?.endpoint ?? REVIEW_ENDPOINTS.FEATURED,
      ),
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    initialData: options?.initialData,
  });
}
