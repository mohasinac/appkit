import { productRepository } from "../repository/products.repository";
import type { ProductDocument } from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

export interface ProductListActionParams {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
  isAuction?: boolean;
  isPreOrder?: boolean;
  featured?: boolean;
  sellerId?: string;
  categoriesIn?: string[];
}

export type ProductListResult = FirebaseSieveResult<ProductDocument>;

export async function listProducts(
  params: ProductListActionParams = {},
): Promise<ProductListResult> {
  const {
    filters,
    sorts = "-createdAt",
    page = 1,
    pageSize = 20,
    isAuction,
    isPreOrder,
    featured,
    sellerId,
    categoriesIn,
  } = params;

  const compoundFilters: string[] = [];
  if (isAuction !== undefined) compoundFilters.push(`isAuction==${isAuction}`);
  if (isPreOrder !== undefined)
    compoundFilters.push(`isPreOrder==${isPreOrder}`);
  if (featured === true) compoundFilters.push("featured==true");
  if (sellerId) compoundFilters.push(`sellerId==${sellerId}`);
  if (filters) compoundFilters.push(filters);
  const mergedFilters =
    compoundFilters.length > 0 ? compoundFilters.join(",") : undefined;

  const sieve: SieveModel = {
    filters: mergedFilters,
    sorts,
    page,
    pageSize,
  };

  return productRepository.list(sieve, { categoriesIn });
}

export async function getProductById(
  id: string,
): Promise<ProductDocument | null> {
  return productRepository.findById(id);
}

export async function getFeaturedProducts(
  pageSize = 8,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: "featured==true,status==published",
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function getFeaturedAuctions(
  pageSize = 6,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: "isAuction==true,status==published",
    sorts: "auctionEndDate",
    page: 1,
    pageSize,
  });
}

export async function getLatestProducts(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: "status==published",
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function getLatestAuctions(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: "isAuction==true,status==published",
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function listAuctions(
  params: ProductListActionParams = {},
): Promise<ProductListResult> {
  const { filters, sorts = "auctionEndDate", page = 1, pageSize = 20 } = params;
  const base = "isAuction==true,status==published";
  return productRepository.list({
    filters: filters ? `${base},${filters}` : base,
    sorts,
    page,
    pageSize,
  });
}

export async function getFeaturedPreOrders(
  pageSize = 6,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: "isPreOrder==true,status==published",
    sorts: "preOrderDeliveryDate",
    page: 1,
    pageSize,
  });
}

export async function getLatestPreOrders(
  pageSize = 12,
): Promise<ProductListResult> {
  return productRepository.list({
    filters: "isPreOrder==true,status==published",
    sorts: "-createdAt",
    page: 1,
    pageSize,
  });
}

export async function listPreOrders(
  params: ProductListActionParams = {},
): Promise<ProductListResult> {
  const {
    filters,
    sorts = "preOrderDeliveryDate",
    page = 1,
    pageSize = 20,
  } = params;
  const base = "isPreOrder==true,status==published";
  return productRepository.list({
    filters: filters ? `${base},${filters}` : base,
    sorts,
    page,
    pageSize,
  });
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 6,
): Promise<ProductListResult> {
  const result = await productRepository.list({
    filters: `categoryId==${categoryId},status==published`,
    sorts: "-createdAt",
    page: 1,
    pageSize: limit + 1,
  });
  return {
    ...result,
    items: result.items.filter((p) => p.id !== excludeId).slice(0, limit),
  };
}

export async function getSellerStorefrontProducts(
  sellerId: string,
): Promise<ProductDocument[]> {
  const products = await productRepository.findBySeller(sellerId);
  return products.filter((p) => p.status === "published");
}
