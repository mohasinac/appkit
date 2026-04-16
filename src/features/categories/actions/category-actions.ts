import { serverLogger } from "../../../monitoring";
import { categoriesRepository } from "../repository/categories.repository";
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

export async function listTopLevelCategories(
  limit = 12,
): Promise<CategoryDocument[]> {
  const all = await categoriesRepository.getCategoriesByTier(0);
  return all
    .filter((c) => c.isActive !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, limit);
}

export async function listBrandCategories(
  limit = 12,
): Promise<CategoryDocument[]> {
  const brands = await categoriesRepository.getBrandCategories();
  return brands.filter((c) => c.isActive !== false).slice(0, limit);
}

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
