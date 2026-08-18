/*
 * WHY: Seeds a minimal pre-order listing for the demo Beyblade catalog.
 * WHAT: Exports 1 pre-order product (Beyblade X seasonal wave) with listingType:"pre-order",
 *       from the Beyblade Arena store.
 *
 * EXPORTS:
 *   productsPreordersSeedData — Array of 1 pre-order product with listingType:"pre-order"
 *
 * @tag domain:products,pre-orders
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

const _rawPreordersSeedData: Partial<ProductDocument>[] = [
  {
    id: "preorder-beyblade-x-bx-08-wave",
    storeId: "store-beyblade-arena",
    brandSlug: "brand-takara-tomy",
    title: "Beyblade X BX-08 Booster — Next Wave",
    slug: "preorder-beyblade-x-bx-08-wave",
    description:
      "Reserve the next Beyblade X booster wave (BX-08) ahead of its India release. Includes randomized top + Xtreme Gear accessory.",
    price: 799,
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "pre-order" as const,
    categorySlugs: ["category-beyblade-x", "category-spinning-tops"],
    categoryNames: ["Beyblade X", "Spinning Tops"],
    brand: "Takara-Tomy",
    images: [
      seedExtMedia("https://picsum.photos/seed/preorder-image-beyblade-x-bx-08-wave-1-20260101/900/900"),
    ],
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45 days
    preOrderProductionStatus: "in_production",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 100,
    preOrderCurrentCount: 18,
    preOrderCancellable: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // -7 days
    updatedAt: new Date(),
  },
];

export const productsPreordersSeedData = _rawPreordersSeedData.map((p) => ({
  tags: [] as string[],
  stockQuantity: p.availableQuantity ?? 1,
  mainImage: p.images?.[0] ?? "",
  ...p,
  listingType: "pre-order" as const,
  searchTokens: buildSearchTokens(
    p.title, p.description, p.brand, p.brandSlug,
    p.categoryNames, p.tags, p.features, p.condition,
    p.specifications?.map((s) => `${s.name} ${s.value}`),
  ),
}));
