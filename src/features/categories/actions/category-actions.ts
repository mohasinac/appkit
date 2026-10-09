import { cache } from "react";
import { serverLogger } from "../../../monitoring";
import { categoriesRepository } from "../repository/categories.repository";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import type {
  CategoryCreateInput,
  CategoryDocument,
  CategoryTreeNode,
  CategoryUpdateInput,
} from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

export async function createCategory(
  input: CategoryCreateInput,
  createdBy: string,
): Promise<CategoryDocument> {
  const categoryData: CategoryCreateInput = {
    ...input,
    createdBy,
    isActive: input.isActive ?? true,
    isSearchable: input.isSearchable ?? true,
    order: input.order ?? 0,
    isFeatured: input.isFeatured ?? false,
    featuredPriority: input.featuredPriority ?? 0,
    rootId: input.rootId ?? "",
    parentIds: input.parentIds ?? (input.parentId ? [input.parentId] : []),
    childrenIds: input.childrenIds ?? [],
    tier: input.tier ?? 0,
    path: input.path ?? "",
    slug: input.slug ?? "",
  };

  const category = await categoriesRepository.createWithHierarchy(categoryData);

  serverLogger.debug("createCategory", { createdBy, categoryId: category.id });

  return category;
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryUpdateInput>,
): Promise<CategoryDocument> {
  const updated = await categoriesRepository.update(
    id,
    input as CategoryUpdateInput,
  );

  serverLogger.info("updateCategory", { categoryId: id });

  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  await categoriesRepository.delete(id);

  serverLogger.info("deleteCategory", { categoryId: id });
}

export async function listCategories(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<CategoryDocument>> {
  const sieve: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "order",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return categoriesRepository.list(sieve);
}

/*
 * Both of these fetched the ENTIRE matching set and `.slice()`d it to 12, on
 * every homepage render. The bound is now pushed into Firestore (with headroom
 * for the post-fetch filters), and both are `cache()`-wrapped so a second reader
 * in the same request tree — the nav, a footer, a sibling section — costs
 * nothing. Measured 2026-10-09 against a 50K-reads/day free tier.
 *
 * The in-memory `isActive !== false` filter is gone: both queries already
 * require `isActive == true`, and a Firestore equality excludes documents
 * lacking the field, so it could never match anything the query had not already
 * admitted. `hidePublicTestData` stays — that one is a real post-filter, which
 * is why the repository fetches with headroom rather than exactly `limit`.
 */
export const listTopLevelCategories = cache(async (
  limit = 12,
): Promise<CategoryDocument[]> => {
  const all = await categoriesRepository.getCategoriesByTier(0, limit);
  return hidePublicTestData(all)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, limit);
});

export const listBrandCategories = cache(async (
  limit = 12,
): Promise<CategoryDocument[]> => {
  // Over-fetch a small margin so `hidePublicTestData` cannot under-fill the row.
  const brands = await categoriesRepository.getBrandCategories(limit + 8);
  return hidePublicTestData(brands).slice(0, limit);
});

export async function getCategoryById(
  id: string,
): Promise<CategoryDocument | null> {
  return categoriesRepository.findById(id);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryDocument | null> {
  return categoriesRepository.getCategoryBySlug(slug);
}

export async function getCategoryChildren(
  parentId: string,
): Promise<CategoryDocument[]> {
  return categoriesRepository.getChildren(parentId);
}

export async function fetchCategoryTree(
  rootId?: string,
): Promise<CategoryTreeNode[]> {
  return categoriesRepository.buildTree(rootId);
}
