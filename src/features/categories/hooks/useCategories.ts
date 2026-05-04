import { useMemo } from "react";
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
    staleTime: 5 * 60 * 1000,
  });

  return {
    categories: query.data ?? [],
    total: query.data?.length ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export interface CategoriesFilteredParams {
  q?: string;
  isFeatured?: boolean;
  isBrand?: boolean;
  rootOnly?: boolean;
  tier?: number;
  minProductCount?: number;
  maxProductCount?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

/** API-driven for structured filters; text search + pagination done in hook (Firestore substring limitation). */
export function useCategoriesFiltered(params: CategoriesFilteredParams = {}) {
  const sp = new URLSearchParams();
  sp.set("flat", "true");
  if (params.isFeatured) sp.set("featured", "true");
  if (params.isBrand) sp.set("isBrand", "true");
  if (params.rootOnly) sp.set("tier", "0");
  else if (params.tier !== undefined) sp.set("tier", String(params.tier));

  const qs = sp.toString();

  const query = useQuery<CategoryItem[]>({
    queryKey: ["categories", "filtered", qs],
    queryFn: () => apiClient.get<CategoryItem[]>(`/api/categories?${qs}`),
    staleTime: 2 * 60 * 1000,
  });

  const { page = 1, pageSize = 24, sort = "name", q = "", minProductCount, maxProductCount } = params;

  const paginated = useMemo(() => {
    let items = query.data ?? [];
    const lq = q.toLowerCase();
    if (lq) items = items.filter((c) => c.name.toLowerCase().includes(lq) || (c.description ?? "").toLowerCase().includes(lq));
    if (minProductCount !== undefined) items = items.filter((c) => ((c as any).productCount ?? 0) >= minProductCount);
    if (maxProductCount !== undefined) items = items.filter((c) => ((c as any).productCount ?? 0) <= maxProductCount);

    items = [...items].sort((a, b) => {
      if (sort === "-productCount") return ((b as any).productCount ?? 0) - ((a as any).productCount ?? 0);
      if (sort === "-name") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const slice = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: slice, total, totalPages };
  }, [query.data, q, sort, page, pageSize, minProductCount, maxProductCount]);

  return {
    categories: paginated.items,
    total: paginated.total,
    totalPages: paginated.totalPages,
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
