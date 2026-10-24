"use client";
import { normalizeError } from "../../../errors/normalize";
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
  /**
   * Tab partition, applied BEFORE pagination.
   *
   * 🛑 Before, not after — the hook paginates internally, so filtering the
   * returned page would show a short grid and a page count for a different,
   * larger set. It is a predicate rather than another flag because the Parts
   * tab cannot be expressed as one: a part carries no `categoryType` and is
   * identified by its ancestry (`category-tabs.ts`).
   *
   * Not part of the react-query key, deliberately — the FETCH is the same
   * unfiltered `?flat=true` for every tab, so keying on it would mint five
   * cache entries for one response.
   *
   * 🛑 That applies to the QUERY KEY ONLY. It must still be a dependency of the
   * in-memory filter/sort memo, and omitting it there was a live bug: a tab
   * change altered nothing else the memo watched, so it returned the previous
   * tab's rows. Caller supplies it via `useCallback` on the tab key.
   */
  predicate?: (c: CategoryItem) => boolean;
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
    queryFn: () => apiClient.get<CategoryItem[]>(CATEGORY_ENDPOINTS.FILTERED(qs)),
    staleTime: 2 * 60 * 1000,
  });

  const { page = 1, pageSize = 24, sort = "name", q = "", minProductCount, maxProductCount } = params;

  /*
   * Every LIVE row in the payload — before any tab partition, search or
   * pagination. Exposed because a caller that partitions this response into
   * tabs needs to know whether a tab has anything in it at all, and its own
   * `categories` slice cannot tell it that (it is one tab's page).
   *
   * 🛑 Deliberately NOT narrowed by `q`. A tab bar that loses tabs as the
   * visitor types is worse than one that keeps a tab whose search found
   * nothing — the second has an honest empty state, the first makes the
   * section look deleted.
   */
  const allRows = useMemo(() => {
    const items = query.data ?? [];
    /*
     * 🛑 AN INACTIVE ROW IS A DEAD FACET, AND UNTIL 2026-10-24 NOTHING ENFORCED IT.
     *
     * `brand-rows.ts` trap 3 states the rule — *"a row with no product is a
     * DEAD FACET, and worse than absent: it renders as a card in the grid that
     * opens an empty page"* — and `franchise-rows.ts` claims its seven inactive
     * rows are therefore *"excluded from the grid and from search"*.
     *
     * **They were not.** `GET /api/categories` builds its Sieve string from
     * `type` / `parentIds` / `isFeatured` / `isBrand` / `showOnHomepage` /
     * `tier` only, and `useCategoriesFiltered` sends nothing but `flat=true`,
     * so no layer ever added an `isActive` clause. All seven inactive
     * franchises have been rendering on the Franchises tab, each one a card
     * opening an empty page. The promise was in a comment; the mechanism did
     * not exist (Root Cause #106).
     *
     * It surfaced when 320 inactive CHARACTER rows were seeded on the strength
     * of that promise — seven dead cards is easy to miss, 320 is not.
     *
     * 🛑 IN MEMORY, AND ONLY ON AN EXPLICIT `false`. Two reasons, both of which
     * a server-side clause would get wrong:
     *
     *   - A Firestore inequality EXCLUDES every document that lacks the field.
     *     `isActive` is optional on `CategoryDocument`, so pushing this down
     *     would hide every row that never set it — which is most of the real
     *     taxonomy. That is the documented trap in CLAUDE.md's TS-patterns
     *     table, in the one shape that returns a plausible non-empty list.
     *   - The same reason `isActive?: boolean` is declared on `CategoryItem` at
     *     all: absent must mean "live", never "unknown".
     *
     * ADMIN IS NOT AFFECTED. `/admin/categories` reads this route through
     * `useAdminListingData`, not this hook, and must keep seeing inactive rows
     * — they are what it offers a Status column to flip.
     */
    return items.filter((c) => c.isActive !== false);
  }, [query.data]);

  const paginated = useMemo(() => {
    let items = allRows;
    const lq = q.toLowerCase();
    if (lq) items = items.filter((c) => c.name.toLowerCase().includes(lq) || (c.description ?? "").toLowerCase().includes(lq));
    if (params.isBrand === false) items = items.filter((c) => !c.isBrand);
    if (params.predicate) items = items.filter(params.predicate);
    if (minProductCount !== undefined) items = items.filter((c) => ((c as any).productCount ?? 0) >= minProductCount);
    if (maxProductCount !== undefined) items = items.filter((c) => ((c as any).productCount ?? 0) <= maxProductCount);

    /*
     * 🛑 This comparator is the ONLY thing that orders the category index —
     * `sort` is never sent to the API (the request is `?flat=true` and nothing
     * else), so an unrecognised value does not fall back to a server ordering,
     * it falls through to name ASC right here. That is how the tier sort
     * shipped "fixed" and stayed broken: CategoriesIndexListing declared
     * DEFAULT_SORT = tier ASC and offered a "Top level first" option, both
     * correct, and this switch had never heard of tier — so the roots stayed
     * off page 1 while four source reads said the code was right.
     *
     * Add a case here for every value in SORT_OPTIONS, or the option is
     * decoration.
     */
    items = [...items].sort((a, b) => {
      if (sort === "-productCount") return ((b as any).productCount ?? 0) - ((a as any).productCount ?? 0);
      if (sort === "productCount") return ((a as any).productCount ?? 0) - ((b as any).productCount ?? 0);
      if (sort === "-name") return b.name.localeCompare(a.name);
      /* Tier ascending puts the roots first; name breaks ties within a tier. */
      if (sort === "tier" || sort === "-tier") {
        const dir = sort === "tier" ? 1 : -1;
        const d = ((a as any).tier ?? 0) - ((b as any).tier ?? 0);
        return d !== 0 ? d * dir : a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const slice = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: slice, total, totalPages };
    /*
     * 🛑 `params.predicate` BELONGS IN THIS LIST, and leaving it out was a live
     * bug on the categories index — not a theoretical lint complaint.
     *
     * The predicate IS the tab partition. `switchTab` writes only the `tab` URL
     * param, so on a tab change `q`, `sort`, `page` and `pageSize` are all
     * unchanged, and the request string is identical for every tab except
     * brands (the one that sends `isBrand=true`) — so react-query hands back
     * the SAME `query.data` reference. With the predicate absent from the deps,
     * nothing in them changed, the memo returned its cached slice, and
     * **switching Categories → Franchises → Bundles re-rendered the previous
     * tab's rows.** Only the brands tab worked, by accident, because its query
     * key differs.
     *
     * It is a changing reference by nature, so the call site must `useCallback`
     * it on the tab key — `CategoriesIndexListing` now does. Were it ever
     * passed inline again the memo would recompute every render, which is
     * merely wasteful over ~1,500 in-memory rows and still CORRECT; the
     * previous behaviour was neither.
     */
  }, [allRows, q, sort, page, pageSize, minProductCount, maxProductCount, params.predicate, params.isBrand]);

  return {
    categories: paginated.items,
    /* Every live row, unpartitioned — see `allRows` above. */
    allRows,
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
      } catch (_err) {
        void normalizeError(_err);
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
