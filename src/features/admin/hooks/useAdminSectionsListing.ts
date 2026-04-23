"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants";
import type { HomepageSectionDocument } from "../../../features/homepage/schemas";

interface AdminSectionsListingResponse {
  items: HomepageSectionDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

interface UseAdminSectionsListingOptions {
  page?: number;
  pageSize?: number;
  sorts?: string;
  filters?: string;
}

export function useAdminSectionsListing({
  page = 1,
  pageSize = 50,
  sorts = "order",
  filters,
}: UseAdminSectionsListingOptions = {}) {
  const queryKey = ["admin", "sections", "listing", { page, pageSize, sorts, filters }];

  const query = useQuery<AdminSectionsListingResponse, ApiClientError>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sorts,
      });

      if (filters) {
        params.append("filters", filters);
      }

      const response = await apiClient.get<AdminSectionsListingResponse>(
        `${ADMIN_ENDPOINTS.SECTIONS}?${params.toString()}`,
      );

      return response;
    },
    staleTime: 30000, // 30 seconds
  });

  return {
    sections: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? pageSize,
    totalPages: query.data?.totalPages ?? 0,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    errorMessage: query.error?.message,
    refetch: query.refetch,
  };
}
