/*
 * WHY: Real (non-tester-sandbox) prize-draw listing so testers and shoppers can exercise
 *      the prize-draw buy → reveal flow against permanent catalog content, not just the
 *      disposable 7-day tester sandbox item. Previously an empty stub — "out of scope for
 *      the minimal Beyblade-focused demo catalog" — now populated with one platform-run
 *      mystery-box draw, on-theme for the spinning-tops catalog.
 * WHAT: Exports 1 prize-draw listing (classic reveal mode, 4 prizes) run by the platform's
 *       own store, letitrip-official.
 *
 * EXPORTS:
 *   productsPrizeDrawsSeedData — Array of 1 Partial<ProductDocument> with listingType:"prize-draw"
 *
 * @tag domain:products,prize-draws
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

export const productsPrizeDrawsSeedData: Partial<ProductDocument>[] = [
  {
    id: "prizedraw-beyblade-mystery-box",
    slug: "prizedraw-beyblade-mystery-box",
    title: "Beyblade Mystery Box — Prize Draw",
    description: "Buy an entry for ₹99 and reveal your prize instantly — win anything from a rare limited-edition Beyblade down to a spare launcher grip. 4 prizes available, revealed on a first-come basis.",
    categorySlugs: ["category-spinning-tops"],
    categoryNames: ["Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 99,
    currency: "INR",
    stockQuantity: 4,
    availableQuantity: 4,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/prizedraw-image-beyblade-mystery-box-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/prizedraw-image-beyblade-mystery-box-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "prize-draw" as const,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    prizeDrawMode: "reveal" as const,
    pricePerEntry: 99,
    prizeMaxEntries: 4,
    prizeCurrentEntries: 0,
    prizeRevealWindowStart: new Date("2026-05-01"),
    prizeRevealWindowEnd: new Date("2026-12-31"),
    prizeRevealStatus: "open" as const,
    prizeRevealDeadlineDays: 7,
    prizeDrawItems: [
      { itemNumber: 1, title: "Limited-Edition Gold Dranzer S", description: "Rare gold-finish collector's edition.", images: [seedExtMedia("https://picsum.photos/seed/prizedraw-item-beyblade-1-20260101/600/600")], condition: "new", estimatedValue: 3499, isWon: false },
      { itemNumber: 2, title: "Beyblade X Starter Set", description: "Full starter set with stadium.", images: [seedExtMedia("https://picsum.photos/seed/prizedraw-item-beyblade-2-20260101/600/600")], condition: "new", estimatedValue: 1999, isWon: false },
      { itemNumber: 3, title: "Spare Parts Bundle", description: "Assorted spare tips, rings, and drivers.", images: [seedExtMedia("https://picsum.photos/seed/prizedraw-item-beyblade-3-20260101/600/600")], condition: "new", estimatedValue: 399, isWon: false },
      { itemNumber: 4, title: "Spare Launcher Grip", description: "Standard replacement launcher grip.", images: [seedExtMedia("https://picsum.photos/seed/prizedraw-item-beyblade-4-20260101/600/600")], condition: "new", estimatedValue: 149, isWon: false },
    ],
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: true,
    isOnSale: false,
    tags: ["prize-draw", "mystery-box"],
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
    searchTokens: buildSearchTokens(
      "Beyblade Mystery Box — Prize Draw",
      "Buy an entry and reveal your prize instantly.",
      "Beyblade",
      "brand-beyblade",
      ["Spinning Tops"],
      ["prize-draw", "mystery-box"],
    ),
  } as unknown as Partial<ProductDocument>,
];
