"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { HomepageSectionDocument } from "../schemas";

export function useHomepageSections(params?: string) {
  return useQuery<HomepageSectionDocument[]>({
    queryKey: ["homepage-sections", params ?? ""],
    queryFn: () =>
      apiClient.get<HomepageSectionDocument[]>(
        `/api/homepage-sections${params ? `?${params}` : ""}`,
      ),
    staleTime: 5 * 60 * 1000,
  });
}
