import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isCollectorDropProduct(doc: ProductDocument): boolean {
  // Accepts the pre-rename "auction" spelling too: a document written before
  // the rename still carries it (see LISTING_KIND_ALIAS_MAP).
  return (
    (doc.listingType === "collector-drop" ||
      (doc.listingType as string) === "auction") &&
    doc.collectorDropEndDate != null
  );
}

// True when the collector drop end date is in the future — gates the Bid button.
export function isActiveCollectorDrop(doc: ProductDocument): boolean {
  return isCollectorDropProduct(doc) && doc.collectorDropEndDate! > new Date();
}
