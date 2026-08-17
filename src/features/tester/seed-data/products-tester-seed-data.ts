/*
 * WHY: Shared tester sandbox — a handful of disposable test products spanning standard,
 *      auction, and pre-order listing types, all owned by store-tester-sandbox, so testers
 *      can exercise buying/bidding/pre-ordering against real code paths. Auto-expires after
 *      7 days (testerSandboxCleanup cascades into any bids on the auction).
 * WHAT: Exports productsTesterSeedData — 2 standard + 1 auction + 1 pre-order product.
 *
 * EXPORTS:
 *   productsTesterSeedData — Array of Partial<ProductDocument> for the seed runner
 *
 * @tag domain:products,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import { ProductDocument } from "../../products/schemas/firestore";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { buildSearchTokens } from "../../../utils/search-tokens";
import { seedExtMedia } from "../../../seed/_helpers/media";
import { testDataExpiresAt } from "./tester-ttl";

const TESTER_STORE_ID = "store-tester-sandbox";
const TESTER_STORE_NAME = "Tester Sandbox Store";

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    storeId: TESTER_STORE_ID,
    storeName: TESTER_STORE_NAME,
    ...p,
    searchTokens: buildSearchTokens(p.title, p.description, p.brand, p.brandSlug, p.categoryNames, p.tags),
  };
}

export const productsTesterSeedData: Partial<ProductDocument>[] = [
  withTokens({
    id: "product-tester-standard-1",
    slug: "product-tester-standard-1",
    title: "Test Gadget — Standard Listing #1",
    description: "Disposable test product for the tester QA program. Buy it, review it, wishlist it — it auto-expires in 7 days.",
    categorySlugs: ["category-tester-gadgets", "category-tester-sandbox"],
    categoryNames: ["Test Gadgets", "Tester Sandbox"],
    brandSlug: "brand-tester-sandbox",
    brand: "TestBrand",
    price: 19900,
    currency: "INR",
    stockQuantity: 10,
    availableQuantity: 10,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-tester-standard-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-tester-standard-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "standard" as const,
    customFields: [],
    customSections: [],
    isPromoted: false,
    isOnSale: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  withTokens({
    id: "product-tester-standard-2",
    slug: "product-tester-standard-2",
    title: "Test Collectible — Standard Listing #2",
    description: "Second disposable test product, referenced by the test bundle. Auto-expires in 7 days.",
    categorySlugs: ["category-tester-collectibles", "category-tester-sandbox"],
    categoryNames: ["Test Collectibles", "Tester Sandbox"],
    brandSlug: "brand-tester-sandbox",
    brand: "TestBrand",
    price: 14900,
    currency: "INR",
    stockQuantity: 10,
    availableQuantity: 10,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/product-image-tester-standard-2-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/product-image-tester-standard-2-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "standard" as const,
    customFields: [],
    customSections: [],
    isPromoted: false,
    isOnSale: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  withTokens({
    id: "auction-tester-sandbox-1",
    slug: "auction-tester-sandbox-1",
    title: "Test Auction — Bid Me!",
    description: "Disposable test auction for the tester QA program. Place a bid — it auto-expires in 7 days, cascading to any bids.",
    categorySlugs: ["category-tester-collectibles", "category-tester-sandbox"],
    categoryNames: ["Test Collectibles", "Tester Sandbox"],
    brandSlug: "brand-tester-sandbox",
    brand: "TestBrand",
    startingBid: 9900,
    currentBid: 9900,
    currency: "INR",
    price: 9900,
    stockQuantity: 1,
    availableQuantity: 1,
    auctionEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    bidCount: 0,
    bidsHaveStarted: false,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-tester-sandbox-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/auction-image-tester-sandbox-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "auction" as const,
    customFields: [],
    customSections: [],
    isPromoted: false,
    isOnSale: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  withTokens({
    id: "preorder-tester-sandbox-1",
    slug: "preorder-tester-sandbox-1",
    title: "Test Pre-order — Reserve Me!",
    description: "Disposable test pre-order for the tester QA program. Auto-expires in 7 days.",
    categorySlugs: ["category-tester-gadgets", "category-tester-sandbox"],
    categoryNames: ["Test Gadgets", "Tester Sandbox"],
    brandSlug: "brand-tester-sandbox",
    brand: "TestBrand",
    price: 29900,
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "pre-order" as const,
    images: [seedExtMedia("https://picsum.photos/seed/preorder-image-tester-sandbox-1-20260101/900/900")],
    mainImage: seedExtMedia("https://picsum.photos/seed/preorder-image-tester-sandbox-1-20260101/900/900"),
    isSold: false,
    availableQuantity: 5,
    customFields: [],
    customSections: [],
    isPromoted: false,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    preOrderProductionStatus: "in_production",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 50,
    preOrderCurrentCount: 0,
    preOrderCancellable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
];
