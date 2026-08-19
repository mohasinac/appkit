/*
 * WHY: Real (non-tester-sandbox) prize-draw listings so testers and shoppers can exercise
 *      both automatic-reveal modes ("instant" and "scheduled") against permanent catalog
 *      content, not just the disposable 7-day tester sandbox item. Previously an empty
 *      stub — "out of scope for the minimal Beyblade-focused demo catalog" — now populated
 *      with two platform-run mystery-box draws, on-theme for the spinning-tops catalog.
 * WHAT: Exports 2 prize-draw listings (classic reveal mode) run by the platform's own
 *       store, letitrip-official — one "instant" mode (4 prizes), one "scheduled" mode
 *       (2 prizes, small pool for easy manual sellout testing).
 *
 * EXPORTS:
 *   productsPrizeDrawsSeedData — Array of 2 Partial<ProductDocument> with listingType:"prize-draw"
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
    prizeRevealMode: "instant" as const,
    pricePerEntry: 99,
    prizeMaxEntries: 4,
    prizeCurrentEntries: 0,
    prizeDrawDurationDays: 7,
    prizeRevealWindowStart: new Date("2026-05-01"),
    prizeRevealWindowEnd: new Date("2026-05-08"),
    prizeRevealStatus: "open" as const,
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
  {
    id: "prizedraw-beyblade-scheduled-demo",
    slug: "prizedraw-beyblade-scheduled-demo",
    title: "Beyblade Champion's Draw — Prize Draw",
    description: "Two entries, two prizes — the winners are revealed automatically the moment the draw closes (3 days) or sells out, whichever comes first.",
    categorySlugs: ["category-spinning-tops"],
    categoryNames: ["Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 149,
    currency: "INR",
    stockQuantity: 2,
    availableQuantity: 2,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/prizedraw-image-beyblade-scheduled-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/prizedraw-image-beyblade-scheduled-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "prize-draw" as const,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    prizeDrawMode: "reveal" as const,
    prizeRevealMode: "scheduled" as const,
    pricePerEntry: 149,
    prizeMaxEntries: 2,
    prizeCurrentEntries: 0,
    prizeDrawDurationDays: 3,
    prizeRevealWindowStart: new Date("2026-05-01"),
    prizeRevealWindowEnd: new Date("2026-05-04"),
    prizeRevealStatus: "open" as const,
    prizeDrawItems: [
      { itemNumber: 1, title: "Beyblade X Champion Set", description: "Tournament-grade champion set.", images: [seedExtMedia("https://picsum.photos/seed/prizedraw-item-beyblade-scheduled-1-20260101/600/600")], condition: "new", estimatedValue: 2499, isWon: false },
      { itemNumber: 2, title: "Spare Tip Multipack", description: "Assorted performance tips.", images: [seedExtMedia("https://picsum.photos/seed/prizedraw-item-beyblade-scheduled-2-20260101/600/600")], condition: "new", estimatedValue: 299, isWon: false },
    ],
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["prize-draw", "mystery-box"],
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
    searchTokens: buildSearchTokens(
      "Beyblade Champion's Draw — Prize Draw",
      "Two entries, two prizes, revealed automatically at close or sellout.",
      "Beyblade",
      "brand-beyblade",
      ["Spinning Tops"],
      ["prize-draw", "mystery-box"],
    ),
  } as unknown as Partial<ProductDocument>,
];
