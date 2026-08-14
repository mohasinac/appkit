import { productRepository } from "../../../repositories";
import type { CatalogueItemDocument } from "../schemas/firestore";
import type { ProductDocument } from "../../products/schemas/firestore";

/** The platform's own consignment store — used whenever a catalogue item is
 * listed by someone with no personal seller store of their own (buyer
 * approval path, admin direct-list path). */
export const CONSIGNMENT_STORE_ID = "store-letitrip-official";

/**
 * Shared field mapping from a catalogue item to a new product — used by
 * both the direct-listing path (seller/admin) and the admin-approval path
 * (buyer). Reuses `ProductDraftFields`-shaped fields already on the
 * catalogue item (title/images/price/condition/categorySlugs/brandSlug) as
 * a near-literal copy; only `storeId` and the `sourceCatalogueItemId`/
 * `sourceCatalogueOwnerId` back-reference differ per caller.
 */
export async function createProductFromCatalogueItem(
  item: CatalogueItemDocument,
  storeId: string,
): Promise<ProductDocument> {
  return productRepository.create({
    title: item.title,
    description: item.description || "Listed via LetItRip's personal catalogue.",
    categorySlugs: item.categorySlugs ?? [],
    brandSlug: item.brandSlug,
    price: item.price ?? 0,
    currency: "INR",
    stockQuantity: item.quantity,
    mainImage: item.mainImage ?? item.images[0] ?? "",
    images: item.images,
    status: "published",
    storeId,
    featured: false,
    tags: [],
    condition: item.condition,
    listingType: "standard",
    sourceCatalogueItemId: item.id,
    sourceCatalogueOwnerId: item.ownerId,
  } as never);
}
