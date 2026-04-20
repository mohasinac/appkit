import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../types";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseCategoriesListOptions {
  initialData?: CategoryItem[];
  enabled?: boolean;
}

export function useCategoriesList(opts?: UseCategoriesListOptions) {
  const query = useQuery<CategoryItem[]>({
    queryKey: ["categories", "flat"],
    queryFn: () => apiClient.get<CategoryItem[]>(CATEGORY_ENDPOINTS.FLAT),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 5 * 60 * 1000, // 5 min — categories change infrequently
  });

  return {
    categories: query.data ?? [],
    total: query.data?.length ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

interface UseCategoryDetailOptions {
  initialCategory?: CategoryItem;
  initialChildren?: CategoryItem[];
  enabled?: boolean;
  categoryEndpoint?: string;
  childrenEndpoint?: string;
}

export function useCategoryDetail(
  slug: string,
  opts?: UseCategoryDetailOptions,
) {
  const categoryEndpoint = opts?.categoryEndpoint ?? CATEGORY_ENDPOINTS.BY_SLUG(encodeURIComponent(slug));
  const categoryQuery = useQuery<CategoryItem | null>({
    queryKey: ["categories", "slug", slug],
    queryFn: async () => {
      try {
        return await apiClient.get<CategoryItem>(categoryEndpoint);
      } catch {
        return null;
      }
    },
    initialData: opts?.initialCategory ?? undefined,
    enabled: opts?.enabled !== false && !!slug,
  });

  const category = categoryQuery.data ?? null;

  const childrenEndpoint = opts?.childrenEndpoint ?? CATEGORY_ENDPOINTS.BY_PARENT(encodeURIComponent(category!.id));
  const childrenQuery = useQuery<CategoryItem[]>({
    queryKey: ["categories", "children", category?.id ?? ""],
    queryFn: () =>
      apiClient.get<CategoryItem[]>(childrenEndpoint),
    enabled: !!category?.id,
    initialData: opts?.initialChildren,
  });

  return {
    category,
    children: childrenQuery.data ?? [],
    isLoading: categoryQuery.isLoading,
    childrenLoading: childrenQuery.isLoading,
    error: categoryQuery.error,
  };
}
