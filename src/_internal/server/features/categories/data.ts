"use server";

import { cache } from "react";
import { categoriesRepository } from "../../../../repositories";
import type { CategoryDocument, CategoryTreeNode } from "../../../../features/categories/schemas/firestore";
import { CATEGORIES_FEATURED_LIMIT, CATEGORIES_MENU_LIMIT, CATEGORIES_SITEMAP_LIMIT } from "../../../shared/features/categories/config";

/** Full category document by slug — deduped per request via React.cache(). */
export const getCategoryForDetail = cache(
  async (slug: string): Promise<CategoryDocument | null> => {
    return (await categoriesRepository.getCategoryBySlug(slug).catch(() => undefined)) ?? null;
  },
);

/** Flat list of all categories at tier 1 (roots) — for nav/sitemap. */
export const listRootCategories = cache(
  async (): Promise<CategoryDocument[]> => {
    return categoriesRepository.getCategoriesByTier(1).catch(() => []);
  },
);

/** Featured categories for homepage display (showOnHomepage: true). */
export const listFeaturedCategories = cache(
  async (): Promise<CategoryDocument[]> => {
    return categoriesRepository
      .list({ filters: "isActive==true,isFeatured==true", sorts: "displayOrder", page: 1, pageSize: CATEGORIES_FEATURED_LIMIT })
      .then((r) => (r as { data?: CategoryDocument[] }).data ?? [])
      .catch(() => []);
  },
);

/** Nav-menu categories (showInMenu: true, tier 1 + 2). */
export const listMenuCategories = cache(
  async (): Promise<CategoryDocument[]> => {
    return categoriesRepository
      .list({ filters: "isActive==true,display.showInMenu==true", sorts: "displayOrder", page: 1, pageSize: CATEGORIES_MENU_LIMIT })
      .then((r) => (r as { data?: CategoryDocument[] }).data ?? [])
      .catch(() => []);
  },
);

/** Full category tree rooted at a given rootId — for sidebar navigation. */
export const getCategoryTree = cache(
  async (rootId?: string): Promise<CategoryTreeNode[]> => {
    return categoriesRepository.buildTree(rootId).catch(() => []);
  },
);

/** Flat category list for sitemap generation. */
export const listSitemapCategories = cache(
  async (): Promise<Pick<CategoryDocument, "slug" | "updatedAt">[]> => {
    return categoriesRepository
      .list({ filters: "isActive==true", sorts: "-updatedAt", page: 1, pageSize: CATEGORIES_SITEMAP_LIMIT })
      .then((r) => {
        const docs = (r as { data?: CategoryDocument[] }).data ?? [];
        return docs.map(({ slug, updatedAt }) => ({ slug, updatedAt }));
      })
      .catch(() => []);
  },
);
