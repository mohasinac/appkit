"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../types";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { isListingCategory } from "../constants/listing-categories";

interface CategoryListResponse {
  items?: CategoryItem[];
  data?: CategoryItem[];
}

/**
 * Returns all categories flattened in DFS tree order:
 * parent → its children → their children, etc.
 * Suitable for use as filter facet options.
 */
export function useCategoryTree(opts?: { enabled?: boolean }) {
  const { data, isLoading } = useQuery<CategoryItem[]>({
    queryKey: ["categories", "tree"],
    queryFn: async () => {
      /*
       * 🛑 `flat=true` is load-bearing, not a preference.
       *
       * `/api/categories` computes `isFiltered` from flat/parentId/featured/
       * isBrand/showOnHomepage/tier/type. `pageSize` and `sort` are NOT in
       * that set — so a request carrying only those falls through to TREE
       * mode, which returns a NESTED payload with only roots at the top
       * level. `flattenTree` below then builds its adjacency map from roots
       * alone and `dfs(null)` emits tier-0 only.
       *
       * Measured against production data before this fix: the category
       * facet on /products, /auctions, /pre-orders and /prize-draws showed
       * **11 options instead of 47** — and 9 of those 11 were not categories
       * at all. It listed "Takara-Tomy", "Hasbro", "Burst Battlers Pack" and
       * "X-Series Starter Set", because brand and bundle rows live in the
       * same collection with empty `parentIds`, so tree mode surfaced them
       * as roots.
       *
       * It failed silently because a short list of plausible-looking names
       * is indistinguishable from a correct one.
       *
       * `sort` was also dropped: BOTH branches hardcode `sort: "order"`, and
       * this hook re-orders by DFS anyway, so passing it implied a control
       * that never existed.
       */
      const res = await apiClient.get<CategoryListResponse | CategoryItem[]>(
        `${CATEGORY_ENDPOINTS.LIST}?flat=true&pageSize=500`,
      );
      const items: CategoryItem[] = Array.isArray(res)
        ? res
        : (res as CategoryListResponse).items ?? (res as CategoryListResponse).data ?? [];
      return flattenTree(items.filter(isListingCategory));
    },
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return {
    categories: data ?? [],
    isLoading,
  };
}

/** Build a flat DFS-ordered list from a flat array with parentIds. */
function flattenTree(items: CategoryItem[]): CategoryItem[] {
  // Build adjacency map
  const byId = new Map<string, CategoryItem>();
  const children = new Map<string | null, CategoryItem[]>();

  for (const item of items) {
    byId.set(item.id, item);
    const parentId = item.parentIds?.[item.parentIds.length - 1] ?? null;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId)!.push(item);
  }

  // Sort each level by order then name
  const sortLevel = (nodes: CategoryItem[]) =>
    nodes.sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });

  const result: CategoryItem[] = [];

  function dfs(parentId: string | null) {
    const nodes = children.get(parentId) ?? [];
    for (const node of sortLevel([...nodes])) {
      result.push(node);
      dfs(node.id);
    }
  }

  dfs(null);
  return result;
}

/** Convert category tree to FacetOption[] with indentation prefix for tier > 0. */
export function categoriesToFacetOptions(
  categories: CategoryItem[],
): { value: string; label: string }[] {
  return categories.map((cat) => ({
    value: cat.slug,
    label:
      (cat.tier ?? 0) === 0
        ? cat.name
        : `${" ".repeat(cat.tier ?? 1)}↳ ${cat.name}`,
  }));
}
