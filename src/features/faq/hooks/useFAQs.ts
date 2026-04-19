"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { FAQ, FAQListResponse, FAQListParams } from "../types";
import { FAQ_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseFAQsOptions {
  initialData?: FAQListResponse;
  enabled?: boolean;
}

export function useFAQs(params: FAQListParams = {}, opts?: UseFAQsOptions) {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.homepage !== undefined)
    sp.set("homepage", String(params.homepage));
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();

  const query = useQuery<FAQListResponse>({
    queryKey: ["faqs", qs],
    queryFn: () =>
      apiClient.get<FAQListResponse>(
        `${FAQ_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`,
      ),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 10 * 60 * 1000,
  });

  return {
    faqs: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useFAQ(
  id: string,
  opts?: { initialData?: FAQ; enabled?: boolean },
) {
  const query = useQuery<FAQ>({
    queryKey: ["faqs", id],
    queryFn: () => apiClient.get<FAQ>(FAQ_ENDPOINTS.BY_ID(id)),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!id,
  });

  return { faq: query.data, isLoading: query.isLoading, error: query.error };
}
