"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { Review } from "../../reviews";

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
      options?.endpoint ?? "/api/reviews?featured=true",
    ],
    queryFn: () =>
      apiClient.get<Review[]>(
        options?.endpoint ?? "/api/reviews?featured=true",
      ),
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    initialData: options?.initialData,
  });
}
