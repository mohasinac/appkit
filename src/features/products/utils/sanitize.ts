/**
 * Strip seller-identity fields from a product record before returning it from a
 * public API endpoint. Public clients must only see store-scoped identity
 * (`storeId`, `storeName`, `storeSlug`) — never `sellerId` (Firebase UID) or
 * the seller's personal name/email.
 *
 * Use on every public GET response that returns products. Admin/seller-scoped
 * routes must NOT sanitize — they legitimately surface owner identity.
 */
const SELLER_IDENTITY_FIELDS = [
  "sellerId",
  "sellerName",
  "sellerEmail",
  "ownerId",
] as const;

export function sanitizeProductForPublic<T extends Record<string, unknown>>(
  item: T,
): T {
  const copy = { ...item };
  for (const field of SELLER_IDENTITY_FIELDS) {
    delete (copy as Record<string, unknown>)[field];
  }
  return copy;
}

export function sanitizeProductsForPublic<T extends Record<string, unknown>>(
  items: readonly T[],
): T[] {
  return items.map((item) => sanitizeProductForPublic(item));
}
