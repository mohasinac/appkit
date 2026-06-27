import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isPreOrderProduct(doc: ProductDocument): boolean {
  return doc.listingType === "pre-order";
}

// True when the pre-order window is still open (not closed, delivery date in future).
export function isOpenPreOrder(doc: ProductDocument): boolean {
  return isPreOrderProduct(doc) && !doc.preOrderClosed && doc.preOrderDeliveryDate! > new Date();
}
