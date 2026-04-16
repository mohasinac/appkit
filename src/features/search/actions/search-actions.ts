/**
 * Search Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { productRepository } from "../../products/repository/products.repository";
import { serverLogger } from "../../../monitoring";
import type { FirebaseSieveResult } from "../../../providers/db-firebase";
import type { ProductDocument } from "../../products/schemas";
import type { SearchQuery } from "../types";

export interface SearchProductsResult extends FirebaseSieveResult<ProductDocument> {
  q: string;
  backend: "in-memory";
}

/**
 * Search products using Firestore Sieve filters.
 * All filtering criteria are optional — omitting them returns all published products.
 */
export async function searchProducts(
  query: SearchQuery = {},
): Promise<SearchProductsResult> {
  const {
    q = "",
    category,
    subcategory,
    minPrice = 0,
    maxPrice = 0,
    condition,
    isAuction,
    isPreOrder,
    sort = "-createdAt",
    page = 1,
    pageSize = 20,
  } = query;

  const filterParts: string[] = ["status==published"];
  if (category) filterParts.push(`category==${category}`);
  if (subcategory) filterParts.push(`subcategory==${subcategory}`);
  if (minPrice > 0) filterParts.push(`price>=${minPrice}`);
  if (maxPrice > 0 && maxPrice >= minPrice)
    filterParts.push(`price<=${maxPrice}`);
  if (condition) filterParts.push(`condition==${condition}`);
  if (isAuction === true) filterParts.push("isAuction==true");
  if (isPreOrder === true) filterParts.push("isPreOrder==true");
  if (q.trim()) filterParts.push(`title_=${q.trim()}`);

  const sieveResult = await productRepository.list({
    filters: filterParts.join(","),
    sorts: sort,
    page,
    pageSize,
  });

  serverLogger.info("searchProducts (Firestore-native)", {
    q: q || "(empty)",
    total: sieveResult.total,
  });

  return { ...sieveResult, q, backend: "in-memory" };
}
