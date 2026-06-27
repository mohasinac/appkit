import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isLiveItemProduct(doc: ProductDocument): boolean {
  return doc.listingType === "live";
}
