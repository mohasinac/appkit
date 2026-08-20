import { Stack } from "../../../ui";
import type { ProductItem } from "../types";
import { RelatedProductsCarousel } from "./RelatedProductsCarousel";

export interface RelatedItemsSectionProps {
  relatedItems: ProductItem[];
  relatedByBrand: ProductItem[];
  relatedByTags: ProductItem[];
  relatedByStore: ProductItem[];
  categoryLabel?: string;
  brandLabel?: string;
  storeLabel?: string;
}

/**
 * The same-shape "More in category / More by brand / You might also like /
 * More from store" carousel stack, shared by every listing-type detail page
 * that surfaces computeRelatedItems() results.
 */
export function RelatedItemsSection({
  relatedItems,
  relatedByBrand,
  relatedByTags,
  relatedByStore,
  categoryLabel,
  brandLabel,
  storeLabel,
}: RelatedItemsSectionProps) {
  if (
    relatedItems.length === 0 &&
    relatedByBrand.length === 0 &&
    relatedByTags.length === 0 &&
    relatedByStore.length === 0
  ) {
    return null;
  }

  return (
    <Stack gap="xl">
      {relatedItems.length > 0 && (
        <RelatedProductsCarousel
          items={relatedItems}
          title={categoryLabel ? `More in ${categoryLabel}` : "More in this category"}
        />
      )}
      {relatedByBrand.length > 0 && (
        <RelatedProductsCarousel items={relatedByBrand} title={brandLabel ? `More by ${brandLabel}` : "More by this brand"} />
      )}
      {relatedByTags.length > 0 && <RelatedProductsCarousel items={relatedByTags} title="You might also like" />}
      {relatedByStore.length > 0 && (
        <RelatedProductsCarousel items={relatedByStore} title={storeLabel ? `More from ${storeLabel}` : "More from this seller"} />
      )}
    </Stack>
  );
}
