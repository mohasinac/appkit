import { productRepository } from "../../products/repository/products.repository";
import { getBrandName } from "../../../core/brand-resolver";
import type { CatalogueItemDocument } from "../schemas/firestore";
import type { ProductDocument } from "../../products/schemas/firestore";
import { PLATFORM_STORE_ID } from "../../stores/schemas/firestore";

/**
 * The platform's own consignment store — used whenever a catalogue item is
 * listed by someone with no personal seller store of their own (buyer
 * approval path, admin direct-list path).
 *
 * 🛑 DERIVED, no longer its own literal. `store-letitrip-official` was written
 * out three times: here, as `PLATFORM_STORE_ID` in
 * `features/stores/schemas/firestore.ts`, and again in the consumer's
 * shipment-link route. And the comment on `PLATFORM_STORE_ID` justified its
 * copy by pointing AT this one — "the same literal already lives legitimately
 * (`CONSIGNMENT_STORE_ID` …)". That argument is about WHERE a brand-bearing
 * literal may live (`audit-ssr-in-appkit` Rule 3 bars `_internal/`); it says
 * nothing about how many copies there may be, and reading it as permission
 * gave one id three owners (Root Cause #42).
 *
 * They are the same store, in two roles. If a consumer ever needs a separate
 * consignment storefront, that is a deliberate second configured value — not
 * a literal that drifted from this one.
 */
export const CONSIGNMENT_STORE_ID = PLATFORM_STORE_ID;

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
    description:
      item.description ||
      `Listed via ${getBrandName()}'s personal catalogue.`,
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
