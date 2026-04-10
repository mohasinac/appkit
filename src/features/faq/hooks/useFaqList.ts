"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { FAQCategory, FAQListResponse } from "../types";

interface UseFaqListOptions {
  category?: FAQCategory;
  search?: string;
  tags?: string[];
  showOnHomepage?: boolean;
  page?: number;
  pageSize?: number;
  sorts?: string;
  enabled?: boolean;
  initialData?: FAQListResponse;
}

export function useFaqList(options: UseFaqListOptions = {}) {
  const params = new URLSearchParams();

  if (options.category) params.set("category", options.category);
  if (options.search) params.set("search", options.search);
  if (options.tags && options.tags.length > 0) {
    params.set("tags", options.tags.join(","));
  }
  if (options.showOnHomepage !== undefined) {
    params.set("showOnHomepage", String(options.showOnHomepage));
  }
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(options.pageSize ?? 20));
  if (options.sorts) params.set("sorts", options.sorts);

  const queryString = params.toString();

  const query = useQuery<FAQListResponse>({
    queryKey: ["faqs", queryString],
    queryFn: () =>
      apiClient.get<FAQListResponse>(
        `/api/faqs${queryString ? `?${queryString}` : ""}`,
      ),
    enabled: options.enabled,
    initialData: options.initialData,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    faqs: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    categories: query.data?.categories ?? [],
  };
}
