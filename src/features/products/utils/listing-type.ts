import type { ListingType, ProductItem } from "../types/index.js";

export function normalizeListingType(
  input?: Partial<
    Pick<ProductItem, "listingType" | "isAuction" | "isPreOrder">
  >,
): ListingType {
  if (input?.listingType) return input.listingType;
  if (input?.isAuction) return "auction";
  if (input?.isPreOrder) return "pre-order";
  return "standard";
}
