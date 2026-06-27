import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isAuctionProduct(doc: ProductDocument): boolean {
  return doc.listingType === "auction" && doc.auctionEndDate != null;
}

// True when the auction end date is in the future — gates the Bid button.
export function isActiveAuction(doc: ProductDocument): boolean {
  return isAuctionProduct(doc) && doc.auctionEndDate! > new Date();
}
