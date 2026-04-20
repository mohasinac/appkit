import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { HomepageSectionDocument } from "../schemas";
import { HOMEPAGE_ENDPOINTS } from "../../../constants/api-endpoints";

export function useHomepageSections(params?: string) {
  return useQuery<HomepageSectionDocument[]>({
    queryKey: ["homepage-sections", params ?? ""],
    queryFn: () =>
      apiClient.get<HomepageSectionDocument[]>(
        `${HOMEPAGE_ENDPOINTS.SECTIONS}${params ? `?${params}` : ""}`,
      ),
    staleTime: 5 * 60 * 1000,
  });
}
