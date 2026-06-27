import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isDigitalCodeProduct(doc: ProductDocument): boolean {
  return doc.listingType === "digital-code";
}

// True when there are codes remaining — gates the Buy Now CTA.
export function hasCodesAvailable(doc: ProductDocument): boolean {
  return isDigitalCodeProduct(doc) && (doc.digitalCode?.codesAvailable ?? 0) > 0;
}
