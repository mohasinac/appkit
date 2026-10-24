/**
 * `loadOptions` adapters for `<PaginatedSelect>` over the PUBLIC taxonomy
 * endpoints.
 *
 * 🛑 Extracted 2026-10-24 because there were already THREE independent copies
 * of this function — `AdminCategoryEditorView`, `AdminProductEditorView` and
 * `CatalogueItemEditorView` — which is the Duplication Framework's Rule of
 * Three trigger, and a fourth was about to be written for the store-creation
 * form. The body below is lifted from the catalogue copy, which is the only
 * one that got both details right (see the two 🛑 notes).
 *
 * The three existing copies are deliberately NOT migrated here: each lives in
 * an editor another session may hold open, and a shared helper with one honest
 * consumer is a better starting point than a four-way edit. They remain as the
 * migration backlog.
 */

import { apiClient } from "../../../http";
import { CATEGORY_ENDPOINTS, BRAND_ENDPOINTS } from "../../../constants/api-endpoints";

export interface TaxonomyOptionPage {
  items: { value: string; label: string }[];
  hasMore: boolean;
}

/**
 * 🛑 PUBLIC endpoints only. A seller-facing picker that reached
 * `/api/admin/categories` would 403 for the very users it exists for, and the
 * failure renders as an empty dropdown rather than an error.
 */
async function loadOptionsFrom(
  endpoint: string,
  query: string,
  page: number,
  /**
   * Extra query params, passed as an object rather than baked into `endpoint`:
   * this builds its own `?`, so a pre-existing query string would produce
   * `...?listingOnly=true?page=1`.
   */
  extra?: Record<string, string>,
): Promise<TaxonomyOptionPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: "25", ...extra });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${endpoint}?${params.toString()}`);
  const data = (res as { items?: { id: string; name: string }[]; hasMore?: boolean }) ?? {};
  return {
    items: (data.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    hasMore: data.hasMore ?? false,
  };
}

/**
 * 🛑 `listingOnly=true` is load-bearing. Without it the picker offers brand
 * and bundle rows as categories — measured against production: "Takara-Tomy",
 * "Original Collector's Set", "Metal Fusion Duo". They share the `categories`
 * collection, and a plain listing category OMITS `categoryType` entirely, so
 * the test cannot be expressed as a query clause; the route applies it in
 * memory.
 */
export const loadCategoryOptions = (q: string, p: number): Promise<TaxonomyOptionPage> =>
  loadOptionsFrom(CATEGORY_ENDPOINTS.LIST, q, p, { listingOnly: "true" });

export const loadBrandOptions = (q: string, p: number): Promise<TaxonomyOptionPage> =>
  loadOptionsFrom(BRAND_ENDPOINTS.LIST, q, p);
