"use server";

import { cache } from "react";
import { categoriesRepository } from "../../../../repositories";
import { safeRead } from "../../../../errors/safe-read";
import type { CategoryDocument, CategoryTreeNode } from "../../../../features/categories/schemas/firestore";
import { CATEGORIES_FEATURED_LIMIT, CATEGORIES_MENU_LIMIT, CATEGORIES_SITEMAP_LIMIT } from "../../../shared/features/categories/config";
import { hidePublicTestData } from "../tester/visibility";

/** Full category document by slug — deduped per request via React.cache(). */
export const getCategoryForDetail = cache(
  async (slug: string): Promise<CategoryDocument | null> => {
    /*
     * 🛑 No view-count write here — deleted 2026-08-31.
     *
     * This fired `incrementViewCount` on every render, which was two defects at
     * once. It is a Firestore WRITE on the render path (Rule #6), and product
     * and category detail were being counted TWICE by two systems that key
     * differently: this one on the document by id, and the client
     * `PageViewTracker` into `pageViews` by slug. They can never reconcile —
     * they disagree on bots, on prefetch, and on JS-disabled clients — so the
     * two numbers were guaranteed to drift and neither could be trusted.
     *
     * `pageViews` is the single counter now. `viewCount` on the document stays
     * for historical rows; nothing increments it.
     */
    return (await categoriesRepository.getCategoryBySlug(slug)) ?? null;
  },
);

/** Flat list of all categories at tier 1 (roots) — for nav/sitemap. */
export const listRootCategories = cache(
  async (): Promise<CategoryDocument[]> => {
    const rows = await safeRead(() => categoriesRepository.getCategoriesByTier(1), {
      route: "/categories",
      key: "categories.listRootCategories",
      fallback: [],
    });
    return hidePublicTestData(rows);
  },
);

/** Featured categories for homepage display (showOnHomepage: true). */
export const listFeaturedCategories = cache(
  async (): Promise<CategoryDocument[]> => {
    const rows = await safeRead(
      () =>
        categoriesRepository
          .list({ filters: "isActive==true,showOnHomepage==true", sorts: "order", page: 1, pageSize: CATEGORIES_FEATURED_LIMIT })
          .then((r) => (r as { data?: CategoryDocument[] }).data ?? []),
      {
        route: "/",
        key: "categories.listFeaturedCategories",
        fallback: [] as CategoryDocument[],
      },
    );
    return hidePublicTestData(rows);
  },
);

/** Nav-menu categories (showInMenu: true, tier 1 + 2). */
export const listMenuCategories = cache(
  async (): Promise<CategoryDocument[]> => {
    const rows = await safeRead(
      () =>
        categoriesRepository
          .list({ filters: "isActive==true,display.showInMenu==true", sorts: "order", page: 1, pageSize: CATEGORIES_MENU_LIMIT })
          .then((r) => (r as { data?: CategoryDocument[] }).data ?? []),
      {
        route: "nav/menu",
        key: "categories.listMenuCategories",
        fallback: [] as CategoryDocument[],
      },
    );
    return hidePublicTestData(rows);
  },
);

/** Full category tree rooted at a given rootId — for sidebar navigation. */
export const getCategoryTree = cache(
  async (rootId?: string): Promise<CategoryTreeNode[]> => {
    return safeRead(() => categoriesRepository.buildTree(rootId), {
      route: "/categories",
      key: "categories.getCategoryTree",
      fallback: [],
    });
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
